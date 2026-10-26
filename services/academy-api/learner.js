import {CASES} from './cases.js';
// Additive bootstrap also supports the existing dashboard Git deployment, where
// Wrangler's separate migration command has not yet been configured.
const schema=[
'CREATE TABLE IF NOT EXISTS learners (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at INTEGER NOT NULL)',
'CREATE TABLE IF NOT EXISTS learner_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES learners(id), expires_at INTEGER NOT NULL)',
'CREATE INDEX IF NOT EXISTS learner_sessions_user ON learner_sessions(user_id)',
'CREATE TABLE IF NOT EXISTS learner_progress (user_id TEXT NOT NULL REFERENCES learners(id), case_id TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(user_id,case_id))',
'CREATE TABLE IF NOT EXISTS live_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)',
'CREATE TABLE IF NOT EXISTS live_orders (session_hash TEXT NOT NULL, mode TEXT NOT NULL, request_id TEXT NOT NULL, unit_minor INTEGER NOT NULL, quantity INTEGER NOT NULL, total_minor INTEGER NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(session_hash,mode,request_id))'];
const ready=new WeakMap();
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const equal=(a,b)=>{let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;};
const enc=new TextEncoder();
async function passwordHash(password,salt,pepper){
 // Pepper protects password verifiers in a DB-only disclosure. Separate salt
 // per account. Workerd permits at most 100,000 PBKDF2 iterations per call.
 const pepperKey=await crypto.subtle.importKey('raw',enc.encode(pepper),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const input=await crypto.subtle.sign('HMAC',pepperKey,enc.encode(password));
 const key=await crypto.subtle.importKey('raw',input,'PBKDF2',false,['deriveBits']);
 return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(salt),iterations:100000},key,256)));
}
export async function ensureLearnerSchema(e){if(!ready.has(e.DB)){const task=e.DB.batch(schema.map(sql=>e.DB.prepare(sql))).catch(error=>{ready.delete(e.DB);throw error;});ready.set(e.DB,task);}await ready.get(e.DB);}
export async function learnerRoute(r,e,h){
 const {body,rate,digest,now,json,fail}=h,p=new URL(r.url).pathname;
 if(!/^\/v1\/(auth|progress|live)(\/|$)/.test(p))return null;
 await ensureLearnerSchema(e);
 const token=r.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
 async function session(table){if(!token)fail(401,'Sign in required');const hash=await digest(token),entry=await e.DB.prepare(`SELECT * FROM ${table} WHERE token_hash=? AND expires_at>?`).bind(hash,now()).first();if(!entry)fail(401,'Session expired');return {...entry,hash};}
 if((p==='/v1/auth/register'||p==='/v1/auth/login')&&r.method==='POST'){
  await rate(r,e,'learner-auth',12,900);const d=await body(r,2048);
  const email=typeof d.email==='string'?d.email.trim().toLowerCase():'';
  if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof d.password!=='string'||d.password.length<12||d.password.length>128)fail(400,'Use a valid email and a password of 12 to 128 characters');
  // Account-based throttling complements the network limit without storing IPs.
  await rate(new Request(r.url,{headers:{'CF-Connecting-IP':email}}),e,'learner-account',10,900);
  let user=await e.DB.prepare('SELECT * FROM learners WHERE email=?').bind(email).first();
  if(p.endsWith('/register')){
   if(user)fail(409,'Account unavailable. Try signing in.');const id=crypto.randomUUID(),salt=random();const hash=await passwordHash(d.password,salt,e.RATE_LIMIT_SALT);
   const insert=await e.DB.prepare('INSERT OR IGNORE INTO learners(id,email,password_hash,salt,created_at) VALUES(?,?,?,?,?)').bind(id,email,hash,salt,now()).run();if(!insert.meta.changes)fail(409,'Account unavailable. Try signing in.');user={id,email};
  }else{
   const hash=await passwordHash(d.password,user?.salt||'missing-account-dummy-salt',e.RATE_LIMIT_SALT);
   if(!user||!equal(hash,user.password_hash))fail(401,'Email or password is incorrect');
  }
  const value=random(),expires=now()+86400*7;
  await e.DB.prepare('DELETE FROM learner_sessions WHERE user_id=? AND expires_at<=?').bind(user.id,now()).run();
  await e.DB.prepare('INSERT INTO learner_sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await digest(value),user.id,expires).run();
  return json({token:value,expires_at:expires,user:{id:user.id,email:user.email}},p.endsWith('/register')?201:200);
 }
 if(p.startsWith('/v1/auth/')||p==='/v1/progress'){
  const s=await session('learner_sessions');
  if(p==='/v1/auth/me'&&r.method==='GET'){const user=await e.DB.prepare('SELECT id,email FROM learners WHERE id=?').bind(s.user_id).first();return json({user});}
  if(p==='/v1/auth/logout'&&r.method==='POST'){await e.DB.prepare('DELETE FROM learner_sessions WHERE token_hash=?').bind(s.hash).run();return json({signed_in:false});}
  if(p==='/v1/progress'&&r.method==='GET'){const entries=(await e.DB.prepare('SELECT case_id FROM learner_progress WHERE user_id=? ORDER BY case_id').bind(s.user_id).all()).results;return json({completed:entries.map(x=>x.case_id),self_reported:true});}
  if(p==='/v1/progress'&&r.method==='POST'){
   await rate(r,e,'progress',180,600);const d=await body(r,8192);
   if(!Array.isArray(d.completed)||d.completed.length>108||d.completed.some(id=>typeof id!=='string'||!Object.hasOwn(CASES,id)))fail(400,'Unknown progress case');
   const removed=d.removed||[];if(!Array.isArray(removed)||removed.length>108||removed.some(id=>typeof id!=='string'||!Object.hasOwn(CASES,id)))fail(400,'Unknown progress case');
   const ids=[...new Set(d.completed)],deleted=[...new Set(removed)],statements=[],stamp=now();
   // Bound query and parameter counts for the D1 Free plan, even at 108 marks.
   for(let i=0;i<deleted.length;i+=25){const chunk=deleted.slice(i,i+25);statements.push(e.DB.prepare('DELETE FROM learner_progress WHERE user_id=? AND case_id IN ('+chunk.map(()=>'?').join(',')+')').bind(s.user_id,...chunk));}
   for(let i=0;i<ids.length;i+=25){const chunk=ids.slice(i,i+25);statements.push(e.DB.prepare('INSERT INTO learner_progress(user_id,case_id,updated_at) VALUES '+chunk.map(()=>'(?,?,?)').join(',')+' ON CONFLICT(user_id,case_id) DO UPDATE SET updated_at=excluded.updated_at').bind(...chunk.flatMap(id=>[s.user_id,id,stamp])));}
   if(statements.length)await e.DB.batch(statements);return json({saved:true});
  }
  if(p==='/v1/progress'&&r.method==='DELETE'){await e.DB.prepare('DELETE FROM learner_progress WHERE user_id=?').bind(s.user_id).run();return json({cleared:true});}
  fail(405,'Method not allowed');
 }
 if(p==='/v1/live/session'&&r.method==='POST'){
  await rate(r,e,'live-session',20,600);const value=random();await e.DB.prepare('INSERT INTO live_sessions(token_hash,expires_at) VALUES(?,?)').bind(await digest(value),now()+7200).run();return json({token:value,expires_in:7200},201);
 }
 if(p.startsWith('/v1/live/')){
  const s=await session('live_sessions');
  if(p==='/v1/live/catalog'&&r.method==='GET')return json({sku:'course-web',title:'Web Security Course',unit_minor:10000,currency:'USD',server_execution:true});
  if(p==='/v1/live/orders'&&r.method==='GET')return json({orders:(await e.DB.prepare('SELECT mode,request_id,unit_minor,quantity,total_minor,created_at FROM live_orders WHERE session_hash=? ORDER BY created_at,request_id').bind(s.hash).all()).results,server_execution:true});
  if(p==='/v1/live/orders'&&r.method==='POST'){
   await rate(r,e,'live-order',60,600);const d=await body(r,2048);
   if(!['vulnerable','fixed'].includes(d.mode)||d.sku!=='course-web'||!Number.isSafeInteger(d.quantity)||d.quantity<1||d.quantity>10||!Number.isSafeInteger(d.unit_minor)||d.unit_minor<1||d.unit_minor>1000000||! /^[a-f0-9-]{36}$/.test(d.request_id||''))fail(400,'Invalid training order');
   const price=d.mode==='fixed'?10000:d.unit_minor;
   // This intentional teaching flaw is restricted to synthetic course orders,
   // scoped to one random session, with no payment or real entitlement system.
   await e.DB.prepare('INSERT OR IGNORE INTO live_orders(session_hash,mode,request_id,unit_minor,quantity,total_minor,created_at) VALUES(?,?,?,?,?,?,?)').bind(s.hash,d.mode,d.request_id,price,d.quantity,price*d.quantity,now()).run();
   const order=await e.DB.prepare('SELECT mode,request_id,unit_minor,quantity,total_minor,created_at FROM live_orders WHERE session_hash=? AND mode=? AND request_id=?').bind(s.hash,d.mode,d.request_id).first();
   if(order.quantity!==d.quantity||order.unit_minor!==price)fail(409,'Request ID already used with different input');
   return json({order,server_execution:true,training_only:true,rule:d.mode==='fixed'?'Price read from the server catalog':'Client price trusted (intentional flaw)'});
  }
  fail(405,'Method not allowed');
 }
 fail(404,'Not found');
}
