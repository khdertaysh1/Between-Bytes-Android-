// Local-only preview with disposable D1 data; not a deployment or cloud account.
import http from 'node:http';
import path from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Miniflare} from 'miniflare';
const root=fileURLToPath(new URL('../',import.meta.url));
const mf=new Miniflare({modules:true,modulesRules:[{type:'ESModule',include:['**/*.js']}],scriptPath:path.join(root,'services/academy-api/worker.js'),compatibilityDate:'2026-07-01',d1Databases:['DB'],bindings:{ADMIN_KEY:'local-preview-admin-key-not-for-production-2026',RATE_LIMIT_SALT:'local-preview-rate-salt-not-for-production-2026',PUBLIC_ORIGINS:'http://terminal.local:4173',LOCAL_DEV:'true'}});
const db=await mf.getD1Database('DB');await db.exec((await readFile(path.join(root,'services/academy-api/migrations/0001_initial.sql'),'utf8')).replaceAll('\n',' '));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.wasm':'application/wasm','.zip':'application/zip','.py':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://'+req.headers.host);
 if(url.pathname==='/__local_preview/admin'){const token=randomBytes(32).toString('hex');await db.prepare('INSERT INTO admin_sessions(token_hash,expires_at) VALUES(?,?)').bind(createHash('sha256').update(token).digest('hex'),Math.floor(Date.now()/1000)+3600).run();res.writeHead(302,{'Location':'/admin/','Set-Cookie':'bb_admin_dev='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600'});res.end();return;}
 if(url.pathname.startsWith('/v1/')||url.pathname==='/health'){const chunks=[];for await(const chunk of req){chunks.push(chunk);if(chunks.reduce((n,c)=>n+c.length,0)>20000){res.writeHead(413);res.end();return;}}const answer=await mf.dispatchFetch(url.href,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});res.writeHead(answer.status,Object.fromEntries(answer.headers));res.end(Buffer.from(await answer.arrayBuffer()));return;}
 if(url.pathname==='/services-config.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end('window.BBServices=Object.freeze('+JSON.stringify({apiBase:url.origin,version:'local-preview'})+');');return;}
 const isAdmin=url.pathname.startsWith('/admin/');const base=path.join(root,isAdmin?'services/academy-api/public':'web');let pathname=decodeURIComponent(url.pathname);if(pathname.endsWith('/'))pathname+='index.html';const filename=path.resolve(base,'.'+pathname);if(!filename.startsWith(base+path.sep)){res.writeHead(403);res.end();return;}
 let data=await readFile(filename);if(isAdmin&&pathname.endsWith('.html'))data=Buffer.from(data.toString().replace('<main>','<main><p class="panel">معاينة محلية · البيانات اختبارية وليست بيانات زوار الموقع العام. <a href="/__local_preview/admin">فتح جلسة إدارة الاختبار</a></p>'));
 res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}});
server.listen(Number(process.env.PORT||4173),'0.0.0.0',()=>console.log('Local Academy preview: disposable services and static web'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close();mf.dispose().finally(()=>process.exit());});
