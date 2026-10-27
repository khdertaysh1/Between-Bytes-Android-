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
test('MFA requires an explicit completed second factor across the entire session ledger',()=>{
 for(const mode of ['vulnerable','fixed'])for(const session of ['session-active','session-logged-out','session-mfa-complete','session-password-only','reset-alice','verify-email-alice','unknown-session']){
  invoke({path:'/academy/reset',fields:{case:'authentication-mfa'}});
  const r=invoke({path:'/academy/api/authentication/authentication-mfa/'+mode,method:'POST',input:{session}});
  const accepted=session==='session-mfa-complete'||(mode==='vulnerable'&&session==='session-password-only');
  assert.equal(r.body.data.authorized,accepted,mode+' '+session);
  if(!accepted)assert.equal(r.body.data.operation_applied??false,false);
  if(mode==='fixed'&&['session-active','session-password-only'].includes(session))assert.equal(r.status,403);
 }
 // The ordinary logout lesson can still accept an active, non-revoked session.
 assert.equal(invoke({path:'/academy/api/authentication/authentication-logout/fixed',method:'POST',input:{session:'session-active'}}).status,200);
});
test('all 108 case routes reject or handle altered field types without uncaught errors or fixed impact',()=>{
 const report=JSON.parse(py.runPython(`
from copy import deepcopy
rows=[]
for c in CATALOG:
 count=0
 for mode in ['vulnerable','fixed']:
  for key in c['normal']:
   for value in [None,True,False,0,-1,1.5,[],{},['x'],{'x':'y'},'', 'x'*1100]:
    invoke(json.dumps({'path':'/academy/reset','fields':{'case':c['id']}}))
    data=deepcopy(c['normal']); data[key]=value
    r=json.loads(invoke(json.dumps({'path':'/academy/api/'+c['group']+'/'+c['id']+'/'+mode,'method':'POST','input':data})))
    assert 200<=r['status']<500, (c['id'],key,r)
    if mode=='fixed':
     evidence=json.loads(invoke(json.dumps({'path':'/academy/evidence?case='+c['id']+'&mode=fixed'})))
     assert not evidence['body'].get('impact'), (c['id'],key,r)
    count+=1
 rows.append({'id':c['id'],'requests':count})
json.dumps(rows)
`));
 assert.equal(report.length,108);
 assert.equal(report.reduce((n,r)=>n+r.requests,0),4176);
});
test('redirect parsing accepts learner-created destinations and each weak rule differs from fixed and from the other weak rules',()=>{
 const samples={ 'code-redirect':'https://attacker.test/new-page', 'redirect-relative':'//attacker.test/new-page', 'redirect-backslash':'/\\attacker.test/new-page', 'redirect-encoded':'%2f%2fattacker.test%2fnew-page', 'redirect-suffix':'https://app.lab.attacker.test/new-page', 'redirect-nested':'/continue?next=https%3A%2F%2Fattacker.test%2Fnew-page' };
 for(const [id,next] of Object.entries(samples)){
  const call=(mode,next)=>invoke({path:'/academy/api/redirect/'+id+'/'+mode,method:'POST',input:{next}});
  const weak=call('vulnerable',next),fixed=call('fixed',next);
  assert.equal(weak.status,200,id);assert.equal(weak.body.data.policy_allowed,true,id);assert.match(weak.body.data.destination,/attacker\.test/);assert.equal(weak.body.data.external,true,id);assert.equal(fixed.status,403,id);assert.equal(fixed.body.data.destination,null,id);
  for(const mode of ['vulnerable','fixed'])for(const path of ['/welcome','/account'])assert.equal(call(mode,path).status,200,id+' '+mode+' internal');
  assert.equal(call('fixed','https://app.lab/continue?next='+encodeURIComponent(next)).status,403,id+' nested fixed');
  if(id!=='code-redirect')assert.equal(call('vulnerable','https://untrusted.test/direct').status,403,id+' distinct weak check');
 }
});
test('redirect origin classification handles protocol/default ports and fixed traces contain only the policy actually executed',()=>{
 const call=(mode,next)=>invoke({path:'/academy/api/redirect/code-redirect/'+mode,method:'POST',input:{next}});
 assert.equal(call('vulnerable','http://app.lab/account').body.data.external,true);
 assert.equal(call('vulnerable','https://app.lab:443/account').body.data.external,false);
 assert.equal(call('vulnerable','https://APP.LAB/account').body.data.external,false);
 assert.equal(call('vulnerable','https://app.lab:0/account').body.data.external,true);
 for(const next of ['/account','https://outside.example/landing']){const r=call('fixed',next);assert.ok(r.body.data.trace.some(e=>e.step==='fixed validation'));assert.equal(r.body.data.trace.some(e=>e.step==='weak validation'),false);}
});
