import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadPyodide} from 'pyodide';
const read=name=>readFile(new URL('../web/engine/'+name,import.meta.url),'utf8');
const rows=JSON.parse(await read('extended_catalog.json')),py=await loadPyodide();py.FS.mkdirTree('/academy');
for(const name of ['academy.py','academy_http.py','commerce.py','request_security.py','resource_labs.py','advanced_labs.py','extended_labs.py','academy_catalog.json','resource_catalog.json','advanced_catalog.json','extended_catalog.json','wasm_api.py'])py.FS.writeFile('/academy/'+name,await read(name));
py.runPython("import sys;sys.path.insert(0,'/academy');from wasm_api import invoke");
const invoke=req=>{py.globals.set('_req',JSON.stringify(req));return JSON.parse(py.runPython('invoke(_req)'));};
const reset=row=>invoke({path:'/academy/reset',fields:{case:row.id}});
const call=(row,mode,input=row.attack)=>invoke({path:`/academy/api/${row.group}/${row.id}/${mode}`,method:'POST',input});
const pair=row=>{reset(row);return {weak:call(row,'vulnerable'),fixed:call(row,'fixed')};};
test('fifty distinct bilingual cases have ten cases per new lab and preserve ordinary use in both variants',()=>{
 assert.equal(rows.length,50);assert.equal(new Set(rows.map(r=>r.id)).size,50);
 for(const group of ['race','oauth','cache','graphql','xml'])assert.equal(rows.filter(r=>r.group===group).length,10);
 for(const r of rows){for(const lang of ['ar','en'])for(const text of [r.title[lang],r.cause[lang],r.fix[lang],r.lesson.story[lang],r.lesson.interpretation[lang]])assert.ok(text.length>10,r.id+' '+lang);
  reset(r);for(const mode of ['vulnerable','fixed']){const control=call(r,mode,r.normal);assert.equal(control.status,200,r.id+' control');const evidence=invoke({path:`/academy/evidence?case=${r.id}&mode=${mode}`}).body;assert.equal(evidence.impact,false,r.id+' benign');if(mode==='fixed')assert.equal(evidence.legitimate,true);}
 }
});
test('race schedule proves overspending or time-of-check/time-of-use impact, not merely repeated input',()=>{
 for(const r of rows.filter(r=>r.group==='race')){const {weak,fixed}=pair(r),w=weak.body.data,f=fixed.body.data;
  if(Object.hasOwn(w.before,'budget')){assert.ok(w.after.spent>w.before.budget,r.id);assert.ok(f.after.spent<=f.before.budget);assert.deepEqual(w.timeline.slice(0,2).map(e=>e.event),['read','read']);assert.deepEqual(f.operations.map(o=>o.status),[200,409]);}
  else{assert.notEqual(w.after.used,w.before.value);assert.equal(f.after.used,null);assert.equal(f.after.operation_applied,false);assert.equal(fixed.status,409);}
  reset(r);const serial=call(r,'vulnerable',{overlap:false,requests:2});assert.equal(serial.body.data.invariant_violated,false,r.id+' sequential control');
 }
});
test('OAuth rejects failed bindings, uses RFC S256, and does not issue or link identities after failure',()=>{
 for(const r of rows.filter(r=>r.group==='oauth')){const {weak,fixed}=pair(r),w=weak.body.data,f=fixed.body.data;
  assert.equal(w.authorized,true,r.id);
  if(['oauth-state','oauth-state-binding'].includes(r.id)){assert.equal(w.session_actor_after,'bob');assert.equal(f.session_actor_after,'alice');assert.equal(f.authorized,false);}
  if(r.id==='oauth-code-reuse'){assert.equal(w.tokens_issued,2);assert.equal(f.tokens_issued,1);assert.equal(fixed.status,207);assert.deepEqual(f.operations.map(o=>o.status),[200,401]);assert.equal(call(r,'fixed').status,401);}
  else{assert.equal(fixed.status,401);assert.equal(f.authorized,false);assert.equal(f.private_profile,null);assert.equal(f.linked_subject,null);}
 }
 const vector=JSON.parse(py.runPython("import extended_labs, json; json.dumps(extended_labs.s256('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'))"));assert.equal(vector,'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});
test('cache cases perform two independent reads and prevent victim contamination while retaining valid caching',()=>{
 for(const r of rows.filter(r=>r.group==='cache')){const {weak,fixed}=pair(r),w=weak.body.data,f=fixed.body.data;
  assert.equal(w.requests.length,2);assert.deepEqual(w.requests.map(x=>x.actor),['prime','victim']);assert.equal(w.requests[1].cache,'HIT');assert.equal(w.cross_context_effect,true);
  assert.equal(f.cross_context_effect,false);assert.notEqual(w.victim_response,f.victim_response,r.id);assert.equal(fixed.status,200);
  if(w.victim_response==='DEMO_ALICE_BILLING'){assert.equal(f.victim_status,401);assert.deepEqual(f.cache_entries,{});assert.equal(f.victim_response,'LOGIN_REQUIRED');}
  reset(r);const benign=call(r,'fixed',r.normal).body.data;assert.equal(benign.requests[1].cache,'HIT');
 }
});
test('GraphQL parses selections, enforces resolver rights and budgets, and does not treat introspection alone as a flaw',()=>{
 for(const r of rows.filter(r=>r.group==='graphql')){const {weak,fixed}=pair(r),w=weak.body.data,f=fixed.body.data;assert.ok(f.errors.length,r.id);assert.ok(w.executed_fields.length);
  if(['graphql-field','graphql-node','graphql-tenant','graphql-schema'].includes(r.id)){assert.equal(fixed.status,200);assert.doesNotMatch(JSON.stringify(f.result),/DEMO_(?:RECOVERY|BOB|SOUTH|ADMIN)/);}
  if(r.id==='graphql-mutation'){assert.equal(w.after.bob_revision,1);assert.equal(f.after.bob_revision,0);}
  if(r.id==='graphql-csrf'){assert.equal(weak.status,200);assert.equal(fixed.status,403);assert.equal(f.after.note,f.before.note);}
  if(['graphql-aliases','graphql-batch'].includes(r.id)){const text=JSON.stringify(f.result);assert.match(text,/429/);assert.doesNotMatch(JSON.stringify(w.result),/429/);}
  if(['graphql-depth','graphql-cost'].includes(r.id)){assert.equal(f.result,null);assert.equal(f.executed_fields.length,0);}
 }
 const schema=rows.find(r=>r.id==='graphql-schema');reset(schema);const normal=call(schema,'fixed',schema.normal);assert.equal(normal.status,200);assert.deepEqual(normal.body.data.errors,[]);assert.equal(normal.body.data.result.__schema.queryType.fields[0].name,'adminExport');
 for(const query of ['{ unknown }','{ me }','{ me { id { nope } } }','{ me(unknown:1) { id } }','{ me { id } } trailing','{ documents(first:"bad") { id } }','{ me { id }','{ a:me { id } a:me { id } }'])assert.equal(call(schema,'fixed',{query}).status,400,query);
});
test('XML resolves only closed fixtures, suppresses fixed reads, and caps entity expansion',()=>{
 for(const r of rows.filter(r=>r.group==='xml')){const {weak,fixed}=pair(r),w=weak.body.data,f=fixed.body.data;assert.equal(weak.status,200,r.id);assert.equal(fixed.status,400);assert.equal(f.accepted,false);assert.deepEqual(f.resource_requests,[]);assert.doesNotMatch(JSON.stringify(f),/DEMO_XML_SECRET|DEMO_INTERNAL_PROFILE/);
  if(r.id==='xml-expansion'){assert.ok(w.expanded_bytes>1000);assert.ok(w.expanded_bytes<=w.budget);}
  else assert.ok(w.resource_requests.length,r.id+' actual resource resolver');
  if(r.id==='xml-blind'){assert.equal(w.text,'Accepted fixture document');assert.equal(w.resource_requests[0].uri,'https://callback.test/ping');}
  if(r.id==='xml-error')assert.match(w.diagnostic,/DEMO_XML_SECRET/);
  if(r.id==='xml-docx')assert.equal(w.container,'docx:word/document.xml');
 }
 const row=rows.find(r=>r.id==='xml-file');assert.equal(call(row,'vulnerable',{xml:'<!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]><r>&x;</r>'}).status,400);
 assert.equal(call(row,'vulnerable',{xml:'<root>'+('x'.repeat(6001))+'</root>'}).status,400);
});
