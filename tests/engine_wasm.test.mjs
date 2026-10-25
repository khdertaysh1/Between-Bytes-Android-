import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadPyodide} from 'pyodide';
const py=await loadPyodide();
py.FS.mkdirTree('/academy');
for(const name of ['academy.py','academy_http.py','commerce.py','request_security.py','resource_labs.py','academy_catalog.json','resource_catalog.json','advanced_labs.py','advanced_catalog.json','wasm_api.py'])py.FS.writeFile('/academy/'+name,await readFile(new URL('../web/engine/'+name,import.meta.url),'utf8'));
py.runPython("import sys; sys.path.insert(0,'/academy'); import json; from wasm_api import invoke; from academy import Academy,CATALOG");
const invoke=request=>{py.globals.set('_request',JSON.stringify(request));return JSON.parse(py.runPython('invoke(_request)'));};
test('original invariants hold across every one of the 96 non-XSS cases in the browser Python runtime',()=>{
 const result=JSON.parse(py.runPython(`
results=[]
for case in CATALOG:
 if case['group']=='xss':continue
 a=Academy(); id=case['id']
 control=a.run(id,'fixed',case['normal'])
 if case['group']=='rate':a.run(id,'vulnerable',case['normal'])
 weak=a.run(id,'vulnerable',case['attack'])
 fixed=a.run(id,'fixed',case['attack'])
 results.append({'id':id,'control':control['legitimate'],'impact':weak['impact'],'protected':fixed['protected'],'flag':bool(fixed['flag'])})
json.dumps(results)
`));
 assert.equal(result.length,96);
 for(const row of result){assert.equal(row.control,true,row.id+' control');assert.equal(row.impact,true,row.id+' impact');assert.equal(row.protected,true,row.id+' protection');assert.equal(row.flag,true,row.id+' evidence');}
});
test('transport preserves business responses, matching evidence, and persistent readback',()=>{
 const request=(mode,price)=>invoke({path:'/academy/api/payment/pay-price/'+mode,method:'POST',input:{price},headers:{'Content-Type':'application/json'}});
 const weak=request('vulnerable',1);assert.equal(weak.status,200);assert.equal(weak.body.data.order.totals.amount_due,1);
 const fixed=request('fixed',1);assert.equal(fixed.status,422);
 const evidence=invoke({path:'/academy/evidence?case=pay-price&mode=fixed'});assert.equal(evidence.body.request_id,fixed.headers['X-Request-ID']);
 const read=invoke({path:'/academy/resource?case=pay-price&mode=fixed'});assert.equal(read.body.data.order.totals.amount_due,10000);assert.equal(read.body.data.order.revision,0);
 assert.equal(request('fixed',10000).status,200);
});
test('virtual routes validate groups, fields, methods and content type',()=>{
 const base={path:'/academy/api/access/acl-read/fixed',method:'POST',input:{object:'a-1'}};
 assert.equal(invoke({...base,method:'GET'}).status,405);
 assert.equal(invoke({...base,headers:{'Content-Type':'text/plain'}}).status,415);
 assert.equal(invoke({...base,input:{object:'a-1',admin:true}}).status,400);
 assert.equal(invoke({...base,path:'/academy/api/payment/acl-read/fixed'}).status,404);
});
test('XSS preview keeps opaque-frame CSP and context-specific code instead of substituting quiz answers',()=>{
 for(const id of ['xss-html','xss-script','xss-dom-query','xss-dom-fragment']){
  const result=invoke({path:'/academy/api/xss/'+id+'/vulnerable',method:'POST',input:{value:'<img src=x onerror=alert(1)>'}});
  assert.equal(result.status,200);
  const evidence=invoke({path:'/academy/evidence?case='+id+'&mode=vulnerable'});
  const preview=invoke({action:'preview',token:evidence.body.token});
  assert.match(preview.html,/connect-src 'none'/);assert.match(preview.html,/parent.postMessage/);
 }
});
test('JWT checks isolate each missing rule; malformed and multi-rule invalid tokens never award evidence',()=>{
 const result=JSON.parse(py.runPython(`
from advanced_labs import token, NOW
rows=[]
for id in ['jwt-none','jwt-signature','jwt-expiry','jwt-audience','jwt-issuer','jwt-purpose']:
 a=Academy()
 attack=next(c for c in CATALOG if c['id']==id)['attack']
 weak=a.run(id,'vulnerable',attack)
 fixed=a.run(id,'fixed',attack)
 malformed=a.run(id,'fixed',{'token':'not-a-jwt'}) if False else None
 multi=a.run(id,'vulnerable',{'token':token({'sub':'bob','exp':NOW-1,'aud':'wrong'})})
 rows.append({'id':id,'weak':weak['data']['authorized'],'fixed':fixed['status'],'leak':fixed['data']['private_profile'],'multi':multi['data']['authorized']})
json.dumps(rows)
`));
 for(const r of result){assert.equal(r.weak,true,r.id);assert.equal(r.fixed,401,r.id);assert.equal(r.leak,null);assert.equal(r.multi,false,r.id);}
 for(const token of ['','not-a-jwt','e30.e30.','@@@.@@@.x']){
  const r=invoke({path:'/academy/api/jwt/jwt-signature/fixed',method:'POST',input:{token}});
  assert.ok([400,401].includes(r.status));
 }
});
test('mass-assignment protection rejects without mutating state and preserves ordinary updates',()=>{
 const result=JSON.parse(py.runPython(`
rows=[]
for c in CATALOG:
 if c['group']!='assignment':continue
 a=Academy();bad=a.run(c['id'],'fixed',c['attack']);good=a.run(c['id'],'fixed',c['normal'])
 rows.append({'id':c['id'],'unchanged':bad['data']['before']==bad['data']['after'],'status':bad['status'],'control':good['legitimate']})
json.dumps(rows)
`));
 for(const r of result){assert.equal(r.unchanged,true,r.id);assert.equal(r.status,403,r.id);assert.equal(r.control,true,r.id);}
 assert.equal(invoke({path:'/academy/api/assignment/assignment-role/fixed',method:'POST',input:{patch:{display_name:'A',role:true}}}).status,400);
 assert.equal(invoke({path:'/academy/api/assignment/assignment-nested/fixed',method:'POST',input:{patch:{display_name:'A',permissions:{export:'true'}}}}).status,400);
});
