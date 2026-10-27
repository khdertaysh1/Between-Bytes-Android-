import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {lessons} from '../web/foundations-content.js';
import * as model from '../web/foundations-model.js';
const read=n=>readFile(new URL('../web/'+n,import.meta.url),'utf8');
test('URL parsing separates the HTTP target from fragments and rejects non-web or credential-bearing URLs',()=>{
 const a=model.webAddress('https://shop.example.test:443/products?id=7#details');assert.equal(a.origin,'https://shop.example.test');assert.equal(a.port,'443');assert.equal(a.httpTarget,'/products?id=7');assert.equal(a.fragment,'#details');
 for(const value of ['javascript:alert(1)','file:///etc/passwd','/relative','https://user:secret@example.test/'])assert.throws(()=>model.webAddress(value));
});
test('valid JSON is distinguished from valid application data without string-to-number coercion',()=>{
 const parsed=model.inspectJson('{"quantity":"2","note":""}');assert.equal(parsed.fields[0].type,'string');assert.equal(model.courseContract(parsed.value).valid,false);assert.equal(model.courseContract(model.inspectJson('{"quantity":2,"note":""}').value).valid,true);
 for(const value of [true,null,[],{quantity:2.5,note:''},{quantity:0,note:''},{quantity:2,note:7},{quantity:2,note:'',role:'admin'}])assert.equal(model.courseContract(value).valid,false);
 assert.equal(model.inspectJson('null').rootType,'null');assert.equal(model.inspectJson('[1,true]').rootType,'array');assert.throws(()=>model.inspectJson('{"quantity":2,}'));assert.throws(()=>model.inspectJson('x'.repeat(4097)));
});
test('session identity and authorization stay distinct; client identity changes grant access only in the vulnerable model',()=>{
 assert.equal(model.authorize('anonymous','bob','bob',true).status,401);for(const claimed of ['alice','bob','admin','']){const result=model.authorize('alice','bob',claimed,false);assert.equal(result.status,403);assert.equal(result.content,null);assert.equal(result.effectiveActor,'alice');}
 assert.equal(model.authorize('alice','bob','bob',true).content,'DEMO_BOB_DOCUMENT');assert.equal(model.authorize('alice','alice','bob',false).status,200);
});
test('origin comparison respects scheme, host and effective port without pretending to calculate cookie transmission',()=>{
 const origin='https://app.example.test/';assert.equal(model.originAndFlags(origin,'https://app.example.test:443/other').sameOrigin,true);
 for(const other of ['http://app.example.test/','https://api.example.test/','https://app.example.test:444/'])assert.equal(model.originAndFlags(origin,other).sameOrigin,false);
 assert.equal(model.originAndFlags(origin,'http://api.example.test/',{httpOnly:true,secure:true}).secureRequirementMet,false);assert.equal(model.originAndFlags(origin,origin,{httpOnly:false}).javascriptMayReadCookie,true);assert.match(model.originAndFlags(origin,origin).cookieSent,/not determined/);
});
test('HTTP exercise creates and reads actual in-memory model notes and preserves errors/status semantics',()=>{
 const base={method:'GET',path:'/catalog',session:'alice',body:''};assert.equal(model.httpExchange(base).response.status,200);assert.equal(model.httpExchange({...base,method:'POST'}).response.status,405);assert.equal(model.httpExchange({...base,path:'/missing'}).response.status,404);assert.equal(model.httpExchange({...base,path:'/notes',session:'anonymous'}).response.status,401);assert.equal(model.httpExchange({...base,path:'/documents/bob'}).response.status,403);
 const request={...base,method:'POST',path:'/notes',body:'{"message":"Hello"}'},created=model.httpExchange(request);assert.equal(created.response.status,201);assert.equal(created.response.headers.Location,'/notes/1');assert.equal(model.httpExchange({...base,path:created.response.headers.Location},created.notes).response.data.message,'Hello');assert.equal(model.httpExchange({...base,path:'/notes/9'},created.notes).response.status,404);assert.equal(model.httpExchange({...base,path:'/notes'},created.notes).response.data.notes[0].message,'Hello');
 assert.equal(model.httpExchange({...request,body:'bad'},created.notes).response.status,400);assert.equal(model.httpExchange({...request,body:'{"message":2}'},created.notes).response.status,422);assert.equal(model.httpExchange({...request},Array(10).fill({message:'x'})).response.status,409);
});
async function ui({hash='',state,blocked=false}={}){
 const dom=new JSDOM(await read('foundations.html'),{url:'https://academy.test/course/foundations.html'+hash,runScripts:'outside-only'}),w=dom.window,d=w.document;w.HTMLElement.prototype.scrollIntoView=()=>{};let calls=0;w.fetch=()=>{calls++;throw Error('Unexpected network call');};
 if(state)w.localStorage.setItem('bb-foundations-v1',JSON.stringify(state));if(blocked)Object.defineProperty(w,'localStorage',{get(){throw Error('blocked storage');}});
 w.__foundationModules={lessons,...model};w.eval('const {lessons,webAddress,inspectJson,courseContract,authorize,originAndFlags,httpExchange,quotation}=window.__foundationModules;\n'+(await read('foundations.js')).replace(/^import .*;\n/gm,''));
 const until=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,0));}throw Error('UI did not settle');};
 const go=async id=>{w.location.hash='#'+id;await until(()=>d.querySelector('#foundation-nav [aria-current=page]').getAttribute('href')==='#'+id);};
 const fill=(id,value)=>{const e=d.getElementById(id);e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}));},run=()=>d.querySelector('#foundation-experiment form').dispatchEvent(new w.Event('submit',{cancelable:true}));
 return {dom,w,d,go,fill,run,calls:()=>calls};
}
test('all six beginner lessons stay open without review marks; both skip links go directly to labs and input never contacts its URL',async()=>{
 const a=await ui();try{assert.equal(a.d.querySelectorAll('#foundation-nav a').length,6);assert.equal(a.d.getElementById('foundation-progress').value,0);for(const id of ['foundation-skip','foundation-skip-hero'])assert.equal(a.d.getElementById(id).getAttribute('href'),'./index.html#labs');for(const lesson of lessons){assert.ok(lesson.sections.length>=4);await a.go(lesson.id);assert.equal(a.d.getElementById('foundation-mark').disabled,false);assert.equal(a.d.getElementById('foundation-run').disabled,false);}a.d.getElementById('foundation-begin').click();assert.equal(a.w.location.hash,'#web');assert.equal(a.d.activeElement.id,'foundation-lesson');await a.go('web');a.fill('basic-url','https://uncontacted.example.test/a?q=1#fragment');a.run();assert.match(a.d.getElementById('foundation-result').textContent,/\/a\?q=1/);assert.equal(a.calls(),0);a.d.getElementById('foundation-language').click();assert.equal(a.d.documentElement.lang,'en');assert.equal(a.d.documentElement.dir,'ltr');assert.match(a.d.getElementById('foundation-heading').textContent,/refresher/);}finally{a.w.close();}
});
test('rendered JSON, identity and origin experiments calculate from edits, clear stale results and render input as text',async()=>{
 const a=await ui({hash:'#json'});try{a.fill('basic-json','{"quantity":"2","note":"<img src=x onerror=alert(1)>"}');a.run();assert.match(a.d.getElementById('foundation-result').textContent,/الصياغة صحيحة، لكن/);assert.equal(a.d.querySelector('#foundation-result img'),null);a.fill('basic-json','{"quantity":2,"note":"ok"}');assert.match(a.d.getElementById('foundation-result').textContent,/عدّلت المدخلات/);a.run();assert.match(a.d.getElementById('foundation-result').textContent,/تحقق عقد/);await a.go('identity');a.fill('identity-claim','bob');a.run();assert.match(a.d.getElementById('foundation-result').textContent,/403/);a.fill('identity-policy','weak');a.run();assert.match(a.d.getElementById('foundation-result').textContent,/DEMO_BOB_DOCUMENT/);await a.go('origins');a.fill('origin-target','https://app.example.test:443/other');a.run();assert.match(a.d.getElementById('foundation-result').textContent,/الأصلان متطابقان/);assert.match(a.d.getElementById('foundation-result').textContent,/لم نقرر أن الكوكي أُرسل/);}finally{a.w.close();}
});
test('request interception pauses before model mutation and the same changed input is rejected by the repaired model',async()=>{
 const a=await ui({hash:'#tools'});try{const app=[...a.d.querySelectorAll('#foundation-experiment button')].find(b=>b.textContent==='كوّن طلب شراء من التطبيق');app.click();assert.match(a.d.getElementById('foundation-result').textContent,/متوقف قبل المعالجة/);assert.doesNotMatch(a.d.getElementById('foundation-result').textContent,/revision/);a.fill('tool-body','{"price":3,"quantity":1}');a.run();assert.match(a.d.getElementById('foundation-result').textContent,/"total": 3/);a.fill('tool-mode','fixed');a.run();assert.match(a.d.getElementById('foundation-result').textContent,/422/);assert.match(a.d.getElementById('foundation-result').textContent,/"revision": 0/);a.fill('tool-body','{"price":10000,"quantity":1}');a.run();assert.match(a.d.getElementById('foundation-result').textContent,/HTTP 200/);assert.equal(a.calls(),0);}finally{a.w.close();}
});
test('self-review state restores without locking lessons, and blocked storage does not block learning',async()=>{
 const a=await ui({state:{last:'identity',completed:['json','unknown','json']}});try{assert.match(a.d.getElementById('foundation-title').textContent,/الجلسة/);assert.equal(a.d.getElementById('foundation-progress').value,1);a.d.getElementById('foundation-mark').click();assert.deepEqual(JSON.parse(a.w.localStorage.getItem('bb-foundations-v1')).completed,['json','identity']);}finally{a.w.close();}
 const b=await ui({blocked:true});try{assert.match(b.d.getElementById('foundation-storage').textContent,/لا يتيح حفظ/);await b.go('tools');b.d.getElementById('foundation-mark').click();assert.equal(b.d.getElementById('foundation-progress').value,1);}finally{b.w.close();}
});
test('offline cache includes the foundation page and both versioned ES module imports',async()=>{
 const sw=await read('sw.js'),source=await read('foundations.js');for(const ref of [...source.matchAll(/from '([^']+)'/g)].map(m=>m[1])){assert.ok(sw.includes(ref),ref);await read(ref.replace(/^\.\//,'').split('?')[0]);}assert.ok(sw.includes('./foundations.html'));
});
