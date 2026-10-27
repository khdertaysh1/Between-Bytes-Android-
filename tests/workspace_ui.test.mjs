import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM,VirtualConsole} from 'jsdom';
import {loadPyodide} from 'pyodide';
const source=name=>readFile(new URL('../web/'+name,import.meta.url),'utf8');
const cases=(await Promise.all(['academy_catalog.json','resource_catalog.json','advanced_catalog.json'].map(name=>source('engine/'+name).then(JSON.parse)))).flat();
const py=await loadPyodide();py.FS.mkdirTree('/academy');
for(const name of ['academy.py','academy_http.py','commerce.py','request_security.py','resource_labs.py','advanced_labs.py','academy_catalog.json','resource_catalog.json','advanced_catalog.json','wasm_api.py'])py.FS.writeFile('/academy/'+name,await source('engine/'+name));
py.runPython("import sys; sys.path.insert(0,'/academy'); from wasm_api import invoke");
const invoke=request=>{py.globals.set('_ui_request',JSON.stringify(request));return JSON.parse(py.runPython('invoke(_ui_request)'));};
const sleep=()=>new Promise(r=>setTimeout(r,0));
async function until(fn,label){for(let i=0;i<400;i++){if(fn())return;await sleep();}throw Error('UI timeout: '+label);}
async function workspace(){
 const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',error=>{if(!/navigation|window.scrollTo/.test(error.message))errors.push(error);});
 const dom=new JSDOM(await source('index.html'),{url:'https://academy.test/',runScripts:'outside-only',virtualConsole:vc});const w=dom.window,d=w.document;
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};w.matchMedia=()=>({matches:false});w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.TextDecoder=TextDecoder;w.TextEncoder=TextEncoder;w.Headers=Headers;
 w.fetch=async url=>new Response(await source('engine/'+new URL(url).pathname.split('/').at(-1)));
 w.BBEngine={fetch:async(path,options={})=>{if(path==='/rooms/session')return new Response('{"local":true}');if(path==='/academy/catalog')return new Response(JSON.stringify({cases}));const request={trace:String(path).startsWith('/academy/api/')&&!!d.getElementById('trace-enabled')?.checked,path,method:options.method||'GET',headers:options.headers||{}};if(typeof options.body==='string')request.input=JSON.parse(options.body);else if(options.body)request.fields=Object.fromEntries(options.body);const r=invoke(request);const response=new Response(JSON.stringify(r.body),{status:r.status,headers:r.headers});response.bbTrace=r.trace;return response;},preview:async token=>invoke({action:'preview',token}).html};
 for(const file of ['case-controls.js','result-view.js','experience.js','learning.js','lab-tools.js','studio.js','academy.js'])w.eval(await source(file));
 await until(()=>d.querySelectorAll('.lab-card').length===15,'catalog');
 const go=async row=>{w.location.hash='#/'+row.group+'/'+row.id;await until(()=>d.getElementById('room-meta').textContent.endsWith(row.id),'route '+row.id);};
 const click=id=>d.getElementById(id).click();
 const variant=mode=>{const select=d.getElementById('studio-mode');select.value=mode;select.dispatchEvent(new w.Event('change',{bubbles:true}));};
 const submit=async id=>{click(id);await until(()=>!d.getElementById('service-submit').disabled,'request');await sleep();};
 return {dom,w,d,errors,go,click,variant,submit};
}
test('expanding a lab then returning home cannot leave the catalog hidden',async()=>{
 const ui=await workspace();try{await ui.go(cases[0]);ui.d.querySelector('.expand-button').click();assert.ok(ui.d.body.classList.contains('workspace-expanded'));ui.d.querySelector('.brand').click();await until(()=>!ui.d.getElementById('overview').hidden,'home');assert.equal(ui.d.body.classList.contains('workspace-expanded'),false);}finally{ui.dom.window.close();}
});
test('new round resets the engine and current request while preserving personal notes',async()=>{
 const ui=await workspace();try{await ui.go(cases[0]);ui.d.getElementById('input').value=JSON.stringify({price:1});ui.d.getElementById('reflection').value='My retained investigation note';ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset');assert.deepEqual(JSON.parse(ui.d.getElementById('input').value),cases[0].normal);assert.equal(ui.d.getElementById('reflection').value,'My retained investigation note');}finally{ui.dom.window.close();}
});
test('all 108 cases mount all tabs and submit a fresh fixed control through their service interface',async()=>{
 const ui=await workspace();const failures=[];
 try{for(const row of cases){await ui.go(row);assert.equal(ui.d.getElementById('studio').dataset.toolProfile,ui.w.BBLabTools.profile(row).type,row.id+' tool profile');ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset '+row.id);ui.click('studio-control');ui.variant('fixed');
  for(const id of ['studio-tab-mission','studio-tab-learning','studio-tab-app','studio-tab-fields','studio-tab-requests','studio-tab-editor','studio-tab-codec','studio-tab-live']){ui.click(id);assert.equal(ui.d.getElementById(id).getAttribute('aria-selected'),'true',row.id+' '+id);}
  ui.click('studio-tab-app');await ui.submit('service-submit');
  const error=ui.d.getElementById('service-error').textContent||ui.d.getElementById('error').textContent;
  const evidence=invoke({path:'/academy/evidence?case='+row.id+'&mode=fixed'}).body;
  if(error||(!evidence.legitimate&&row.group!=='xss'))failures.push({id:row.id,error,status:evidence.status,body:evidence});
  assert.ok(ui.d.getElementById('learner-code'),row.id+' code workspace');assert.ok(ui.d.getElementById('flow-source'),row.id+' actual source');if(row.group!=='xss'){assert.ok(ui.d.getElementById('flow-step').options.length>0,row.id+' interpreter trace');assert.match(ui.d.getElementById('flow-request').textContent,/POST/);}
  assert.equal(ui.d.querySelector('[data-logic-mode=fixed]').dataset.selected,'true',row.id+' selected fixed logic');
  assert.equal(ui.d.querySelector('[data-logic-mode=fixed] pre').textContent.trim(),row.lesson.fixed_code.trim(),row.id+' fixed teaching source');
  for(const id of ['service-ui','checks','response','studio-form'])assert.equal(ui.d.querySelectorAll('#'+id).length,1,row.id+' duplicate '+id);
 }
 assert.deepEqual(failures,[]);assert.deepEqual(ui.errors.map(e=>e.message),[]);
 }finally{ui.dom.window.close();}
});
test('every case keeps correct previous/next boundaries after requests and its picker selects the right case',async()=>{
 const ui=await workspace();try{for(const row of cases){await ui.go(row);const siblings=cases.filter(c=>c.group===row.group),index=siblings.findIndex(c=>c.id===row.id);assert.equal(ui.d.getElementById('studio-case').value,row.id);assert.equal(ui.d.getElementById('studio-previous').disabled,index===0,row.id+' previous');assert.equal(ui.d.getElementById('studio-next').disabled,index===siblings.length-1,row.id+' next');assert.equal(ui.d.getElementById('studio-case').options.length,siblings.length);}
 const row=cases.find(c=>c.id==='pay-price');await ui.go(row);const select=ui.d.getElementById('studio-case');select.value='pay-refund';select.dispatchEvent(new ui.w.Event('change'));await until(()=>ui.d.getElementById('room-meta').textContent.endsWith('pay-refund'),'picker navigation');assert.match(ui.d.getElementById('service-submit').textContent,/استرداد/);
 }finally{ui.dom.window.close();}
});
test('resource cards change supported fields for documents, batches, nested objects, exports and downloads',async()=>{
 const ui=await workspace();try{for(const row of cases.filter(c=>c.group==='access')){await ui.go(row);ui.click('studio-control');const cards=[...ui.d.querySelectorAll('.document-item')];for(const card of cards){card.click();const input=JSON.parse(ui.d.getElementById('input').value);assert.deepEqual(Object.keys(input).filter(key=>!Object.hasOwn(row.normal,key)&&!Object.hasOwn(row.attack,key)),[],row.id);assert.ok(Object.hasOwn(input,card.dataset.resourceKey));if(row.id==='acl-batch')assert.ok(Array.isArray(input.objects));}if(['acl-role','acl-mass'].includes(row.id))assert.equal(cards.length,0,row.id+' irrelevant document picker');}
 }finally{ui.dom.window.close();}
});
test('all upload presets are compatible with their own fixed case instead of offering unsupported SVG everywhere',async()=>{
 const ui=await workspace();try{for(const row of cases.filter(c=>c.group==='upload')){await ui.go(row);ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset');const fixture=ui.d.querySelector('.fixture-library button');fixture.click();assert.deepEqual(JSON.parse(ui.d.getElementById('input').value),row.normal);ui.variant('fixed');await ui.submit('service-submit');assert.match(ui.d.getElementById('service-response').textContent,/201/);}
 }finally{ui.dom.window.close();}
});
test('guide remains usable during a request and invalid fields cannot leave a permanent loading status',async()=>{
 const ui=await workspace();try{await ui.go(cases[0]);const original=ui.w.BBEngine.fetch;let release;ui.w.BBEngine.fetch=async(...args)=>{if(args[0].includes('/api/'))await new Promise(resolve=>release=resolve);return original(...args);};ui.click('service-submit');assert.equal(ui.d.querySelector('.guide-button').disabled,false);ui.d.querySelector('.guide-button').click();assert.equal(ui.d.getElementById('lesson-drawer').open,true);ui.d.querySelector('.drawer-close').click();release();await until(()=>!ui.d.getElementById('service-submit').disabled,'finish');assert.equal(ui.d.getElementById('studio-previous').disabled,true);
 ui.w.BBEngine.fetch=original;ui.d.getElementById('input').value='{"unexpected":1}';await ui.submit('service-submit');assert.ok(ui.d.getElementById('service-error').textContent);assert.doesNotMatch(ui.d.getElementById('service-response').textContent,/جارٍ/);
 }finally{ui.dom.window.close();}
});
test('interceptor edits update the application fields and mark the last result as stale',async()=>{
 const ui=await workspace();try{const row=cases.find(c=>c.id==='pay-quantity');await ui.go(row);ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset');await ui.submit('service-submit');ui.click('studio-tab-fields');const field=ui.d.querySelector('[data-key="quantity"] [data-value]');field.value='2';field.dispatchEvent(new ui.w.Event('input',{bubbles:true}));assert.equal(ui.d.querySelector('[data-service-field="quantity"]').value,'2');assert.ok(ui.d.getElementById('request-state').classList.contains('pending'));}
 finally{ui.dom.window.close();}
});
test('encoding tools only apply transformed text to compatible string fields and JWT inspection is case-specific',async()=>{
 const ui=await workspace();try{await ui.go(cases.find(c=>c.id==='pay-quantity'));ui.click('studio-tab-codec');assert.equal(ui.d.getElementById('studio-codec-apply').disabled,true);assert.equal(ui.d.getElementById('studio-codec-field').options.length,0);assert.doesNotMatch(ui.d.getElementById('studio-panel-codec').textContent,/فك JWT/);
 await ui.go(cases.find(c=>c.id==='xss-html'));ui.click('studio-tab-codec');assert.equal(ui.d.getElementById('studio-codec-apply').disabled,true);ui.d.getElementById('studio-codec-input').value='hello world';[...ui.d.querySelectorAll('#studio-panel-codec button')].find(b=>b.textContent==='ترميز URL').click();assert.equal(ui.d.getElementById('studio-codec-output').value,'hello%20world');assert.equal(ui.d.getElementById('studio-codec-apply').disabled,false);ui.click('studio-codec-apply');assert.equal(JSON.parse(ui.d.getElementById('input').value).value,'hello%20world');
 await ui.go(cases.find(c=>c.id==='jwt-none'));ui.click('studio-tab-codec');ui.d.getElementById('studio-codec-input').value=cases.find(c=>c.id==='jwt-none').normal.token;[...ui.d.querySelectorAll('#studio-panel-codec button')].find(b=>b.textContent==='فك JWT · دون تحقق').click();assert.equal(ui.d.getElementById('studio-codec-apply').disabled,true);assert.equal(JSON.parse(ui.d.getElementById('studio-codec-output').value).signature_verified,false);
 }finally{ui.dom.window.close();}
});
test('request history compares actual responses and loads selected requests into the HTTP editor',async()=>{
 const ui=await workspace();try{await ui.go(cases.find(c=>c.id==='pay-price'));ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset');ui.variant('vulnerable');const price=ui.d.querySelector('[data-key="price"] [data-value]');price.value='1';price.dispatchEvent(new ui.w.Event('input'));await ui.submit('studio-submit');ui.variant('fixed');await ui.submit('studio-submit');ui.click('studio-tab-requests');
 for(let i=0;i<2;i++){const checkbox=ui.d.querySelectorAll('.studio-network-row input')[i];checkbox.checked=true;checkbox.dispatchEvent(new ui.w.Event('change'));}ui.click('studio-compare');const diff=ui.d.getElementById('studio-diff').textContent;assert.match(diff,/200/);assert.match(diff,/422/);assert.match(diff,/vulnerable/);assert.match(diff,/fixed/);
 const checkbox=ui.d.querySelectorAll('.studio-network-row input')[1];checkbox.checked=false;checkbox.dispatchEvent(new ui.w.Event('change'));ui.click('studio-edit');assert.equal(ui.d.getElementById('studio-tab-editor').getAttribute('aria-selected'),'true');assert.match(ui.d.getElementById('studio-http').value,/POST \/academy\/api\/payment\/pay-price\//);assert.match(ui.d.getElementById('studio-http').value,/"price": 1/);
 }finally{ui.dom.window.close();}
});
test('blank natural numeric input is invalid and never silently becomes a submitted zero',async()=>{
 const ui=await workspace();try{await ui.go(cases.find(c=>c.id==='pay-quantity'));const field=ui.d.querySelector('[data-service-field="quantity"]');field.value='';field.dispatchEvent(new ui.w.Event('input'));assert.equal(field.checkValidity(),false);assert.notEqual(JSON.parse(ui.d.getElementById('input').value).quantity,0);assert.ok(ui.d.getElementById('service-error').textContent);}
 finally{ui.dom.window.close();}
});
test('all 96 non-browser cases reproduce impact and matching fixed protection through the field interceptor',async()=>{
 const ui=await workspace();const failures=[];
 const edit=input=>{for(const item of ui.d.querySelectorAll('.studio-field')){const key=item.dataset.key,included=Object.hasOwn(input,key);item.querySelector('[data-include]').checked=included;if(!included)continue;const value=input[key],kind=value===null||typeof value==='object'?'json':typeof value;item.querySelector('[data-type]').value=kind;item.querySelector('[data-value]').value=kind==='string'?value:JSON.stringify(value);}};
 try{for(const row of cases.filter(c=>c.group!=='xss')){
  await ui.go(row);ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset');ui.variant('fixed');ui.click('studio-control');await ui.submit('studio-submit');
  ui.variant('vulnerable');if(row.group==='rate'){edit(row.normal);await ui.submit('studio-submit');}
  edit(row.attack);await ui.submit('studio-submit');const weak=invoke({path:'/academy/evidence?case='+row.id+'&mode=vulnerable'}).body;
  assert.equal(ui.d.getElementById('service-effect').dataset.state,'impact',row.id+' weak visible impact');assert.equal(ui.d.getElementById('service-effect').dataset.mode,'vulnerable');const weakView=ui.d.getElementById('service-effect').querySelector('.result-content').textContent;
  ui.variant('fixed');assert.equal(ui.d.getElementById('service-effect').dataset.state,'waiting');assert.deepEqual(JSON.parse(ui.d.getElementById('input').value),row.attack);edit(row.attack);await ui.submit('studio-submit');const fixed=invoke({path:'/academy/evidence?case='+row.id+'&mode=fixed'}).body;
  assert.equal(ui.d.getElementById('service-effect').dataset.state,'protected',row.id+' fixed visible rejection');assert.equal(ui.d.getElementById('service-effect').dataset.mode,'fixed');assert.notEqual(ui.d.getElementById('service-effect').querySelector('.result-content').textContent,weakView,row.id+' different rendered result');assert.equal(ui.d.getElementById('response-comparison').hidden,false);assert.equal(ui.d.querySelectorAll('[data-comparison-mode] [data-result-key], [data-comparison-mode] dd').length>0,true,row.id+' real response comparison');
  assert.equal(ui.d.getElementById('site-comparison').open,true,row.id+' comparison opens after both actual submissions');
  assert.ok(ui.d.querySelectorAll('[data-diff-path]').length>0,row.id+' actual business-data differences');
  for(const mode of ['vulnerable','fixed'])assert.equal(ui.d.querySelector('[data-code-mode='+mode+'] pre').textContent.trim(),row.lesson[mode==='fixed'?'fixed_code':'bad_code'].trim(),row.id+' '+mode+' teaching code');
  assert.match(ui.d.querySelector('.comparison-http').textContent,/x-request-id/,row.id+' actual response headers');
  for(const mode of ['vulnerable','fixed'])assert.ok(ui.d.querySelector('[data-executed-mode='+mode+'] [data-source-line]'),row.id+' '+mode+' actual interpreter source');
  if(!weak.impact||!fixed.protected||!fixed.flag)failures.push({id:row.id,weak:weak.status,fixed:fixed.status,error:ui.d.getElementById('service-error').textContent});
  assert.deepEqual(JSON.parse(ui.d.getElementById('input').value),row.attack,row.id+' typed interceptor');
 }
 assert.deepEqual(failures,[]);
 }finally{ui.dom.window.close();}
});

test('fixed null resources, empty results and HTTP 200 protections remain visible in the app viewport',async()=>{
 const ui=await workspace();try{for(const id of ['acl-read','disclosure-env','code-sqli','cors-reflect','authentication-reset-binding','code-redirect']){const row=cases.find(c=>c.id===id);await ui.go(row);ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset');ui.d.getElementById('input').value=JSON.stringify(row.attack);ui.variant('fixed');await ui.submit('service-submit');const out=ui.d.getElementById('service-effect');assert.equal(out.hidden,false,id);assert.equal(out.dataset.state,'protected',id);assert.match(out.textContent,/مُنعت/);assert.ok(out.querySelector('.result-content').textContent.length>15,id);}}
 finally{ui.dom.window.close();}
});
test('MFA fixed application denies generic active sessions and displays only completed-factor profiles',async()=>{
 const ui=await workspace();try{
  await ui.go(cases.find(c=>c.id==='authentication-mfa'));ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset MFA');ui.variant('fixed');
  for(const [session,allowed] of [['session-active',false],['session-password-only',false],['session-mfa-complete',true]]){
   const field=ui.d.querySelector('[data-service-field="session"]');field.value=session;field.dispatchEvent(new ui.w.Event('input',{bubbles:true}));await ui.submit('service-submit');
   const content=ui.d.getElementById('site-business-result').textContent;
   assert.equal(content.includes('DEMO_PRIVATE_PROFILE'),allowed,session+' private data');
   assert.match(ui.d.getElementById('service-response').textContent,allowed?/200/:/403/,session+' response');
  }
 }finally{ui.dom.window.close();}
});
test('directory, diagnostic and client-key disclosure pages show returned fields and hide them on denial',async()=>{
 const ui=await workspace();try{for(const [id,visible] of [['disclosure-listing','billing-demo.csv'],['disclosure-trace','/srv/northstar/accounts.py:42'],['disclosure-apikey','DEMO_INERT_SERVER_ONLY_KEY']]){
  const row=cases.find(c=>c.id===id);await ui.go(row);ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset '+id);ui.d.getElementById('input').value=JSON.stringify(row.attack);ui.variant('vulnerable');await ui.submit('service-submit');assert.ok(ui.d.getElementById('site-business-result').textContent.includes(visible),id+' actual disclosed content');
  ui.variant('fixed');await ui.submit('service-submit');assert.equal(ui.d.getElementById('site-business-result').textContent.includes(visible),false,id+' no denied content');assert.equal(ui.d.getElementById('virtual-page').dataset.outcome,'protected');
 }}finally{ui.dom.window.close();}
});
test('payment page shows independently read state for coupon, gift, replay and subscription outcomes',async()=>{
 const ui=await workspace();try{for(const [id,label] of [['pay-coupon-reuse','WELCOME'],['pay-gift','gift_alice'],['pay-replay','تم تجاهل إعادة التنفيذ'],['pay-trial','premium']]){
  const row=cases.find(c=>c.id===id);await ui.go(row);ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset '+id);ui.d.getElementById('input').value=JSON.stringify(row.attack);ui.variant('vulnerable');await ui.submit('service-submit');assert.ok(ui.d.getElementById('site-business-result').textContent.includes(label),id+' resource state');assert.ok(ui.d.querySelector('.readback-caption'),id+' independent readback label');ui.variant('fixed');await ui.submit('service-submit');assert.ok(ui.d.querySelector('[data-diff-path^="GET.resource"]'),id+' saved state comparison');
 }}finally{ui.dom.window.close();}
});
test('paired replay sends the current body to the other variant and reset clears comparison',async()=>{
 const ui=await workspace();try{const row=cases.find(c=>c.id==='acl-read');await ui.go(row);ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset');ui.d.getElementById('input').value=JSON.stringify(row.attack);ui.variant('vulnerable');await ui.submit('service-submit');await ui.submit('compare-replay');assert.equal(ui.d.getElementById('studio-mode').value,'fixed');assert.equal(ui.d.querySelector('[data-comparison-mode=vulnerable]').dataset.state,'impact');assert.equal(ui.d.querySelector('[data-comparison-mode=fixed]').dataset.state,'protected');ui.d.querySelector('[data-service-field=object]').value='a-1';ui.d.querySelector('[data-service-field=object]').dispatchEvent(new ui.w.Event('input'));assert.equal(ui.d.getElementById('response-comparison').hidden,true);ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset');assert.equal(ui.d.getElementById('response-comparison').hidden,true);}
 finally{ui.dom.window.close();}
});

test('code workspace runs actual Python, applies its request explicitly, and sends it through the traced engine',async()=>{
 const ui=await workspace();try{
  const row=cases.find(c=>c.id==='pay-price');await ui.go(row);ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset');
  py.runPython(await source('engine/learner_runner.py'));let worker;ui.w.Worker=class{constructor(){worker=this;}postMessage(data){this.data=data;}terminate(){this.terminated=true;}};
  const code=ui.d.getElementById('learner-code');code.value='request["price"] = 1\nprint(request)';code.dispatchEvent(new ui.w.Event('input'));ui.click('code-run');assert.equal(code.disabled,true);assert.equal(ui.d.getElementById('code-stop').disabled,false);
  py.globals.set('_student_ui',JSON.stringify(worker.data));worker.onmessage({data:{type:'running'}});worker.onmessage({data:{type:'result',result:JSON.parse(py.runPython('run_student(_student_ui)'))}});
  assert.equal(code.disabled,false);assert.equal(JSON.parse(ui.d.getElementById('input').value).price,10000,'running code alone never sends or applies it');assert.equal(JSON.parse(ui.d.getElementById('code-result').textContent).price,1);ui.variant('vulnerable');await ui.submit('code-send');assert.equal(ui.d.getElementById('service-effect').dataset.state,'impact');assert.ok(ui.d.getElementById('flow-step').options.length>0);assert.match(ui.d.getElementById('flow-response').textContent,/HTTP 200/);
  code.value='1/0';code.dispatchEvent(new ui.w.Event('input'));assert.equal(ui.d.getElementById('code-send').disabled,true);assert.equal(ui.d.getElementById('code-result').textContent,'');ui.click('code-run');py.globals.set('_student_ui',JSON.stringify(worker.data));worker.onmessage({data:{type:'result',result:JSON.parse(py.runPython('run_student(_student_ui)'))}});assert.match(ui.d.getElementById('code-output').textContent,/ZeroDivisionError/);assert.equal(ui.d.getElementById('code-send').disabled,true);
  code.value='while True: pass';code.dispatchEvent(new ui.w.Event('input'));ui.click('code-run');ui.click('code-stop');assert.equal(worker.terminated,true);assert.equal(code.disabled,false);assert.equal(ui.d.getElementById('code-output').textContent,'');
 }finally{ui.w.BBLearning.stop();ui.dom.window.close();}
});

test('SQL and JSON worksheets, JWT components and terminal requests execute through their distinct controls',async()=>{
 const ui=await workspace();try{
  for(const id of ['code-sqli','code-nosql','code-template']){const row=cases.find(c=>c.id===id);await ui.go(row);ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset');const key=id==='code-sqli'?'query':id==='code-nosql'?'password':'template';ui.d.getElementById('query-value').value=key==='password'?JSON.stringify(row.attack[key]):row.attack[key];ui.variant('vulnerable');await ui.submit('query-run');assert.equal(ui.d.getElementById('service-effect').dataset.state,'impact',id);ui.variant('fixed');await ui.submit('query-run');assert.equal(ui.d.getElementById('service-effect').dataset.state,'protected',id);}
  for(const row of cases.filter(c=>c.group==='jwt')){await ui.go(row);ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset');const parts=row.attack.token.split('.');ui.d.getElementById('jwt-header').value=Buffer.from(parts[0],'base64url').toString();ui.d.getElementById('jwt-claims').value=Buffer.from(parts[1],'base64url').toString();ui.d.getElementById('jwt-signature').value=parts[2]||'';ui.variant('vulnerable');await ui.submit('jwt-send');assert.equal(ui.d.getElementById('service-effect').dataset.state,'impact',row.id);ui.variant('fixed');await ui.submit('jwt-send');assert.equal(ui.d.getElementById('service-effect').dataset.state,'protected',row.id);}
  const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
  for(const row of cases.filter(c=>['rate','ssrf','traversal','disclosure'].includes(c.group))){await ui.go(row);ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset');for(const mode of ['vulnerable','fixed']){if(row.group==='rate'){ui.d.getElementById('terminal-command').value='curl /academy/api/'+row.group+'/'+row.id+'/'+mode+' --json '+quote(JSON.stringify(row.normal));await ui.submit('terminal-run');}ui.d.getElementById('terminal-command').value='curl /academy/api/'+row.group+'/'+row.id+'/'+mode+' --json '+quote(JSON.stringify(row.attack));await ui.submit('terminal-run');assert.equal(ui.d.getElementById('tool-error').textContent,'',row.id);assert.equal(ui.d.getElementById('service-effect').dataset.state,mode==='fixed'?'protected':'impact',row.id+' '+mode);}assert.match(ui.d.getElementById('terminal-output').textContent,/HTTP/);}
 }finally{ui.w.BBLearning.stop();ui.dom.window.close();}
});
test('each redirect navigates its virtual page, blocks the same attack in fixed, and returns without resubmission',async()=>{
 const ui=await workspace();try{for(const row of cases.filter(c=>c.group==='redirect')){await ui.go(row);ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset');
  for(const mode of ['vulnerable','fixed']){ui.variant(mode);ui.click('studio-control');await ui.submit('service-submit');assert.equal(ui.d.getElementById('virtual-page').dataset.page,'navigated',row.id+' '+mode+' control');assert.match(ui.d.getElementById('browser-location').textContent,/app\.lab\/(account|welcome)/);}
  ui.variant('vulnerable');ui.d.getElementById('input').value=JSON.stringify(row.attack);await ui.submit('service-submit');assert.equal(ui.d.getElementById('virtual-page').dataset.page,'navigated',row.id);assert.match(ui.d.getElementById('browser-location').textContent,/outside\.example/);const count=ui.d.querySelectorAll('.studio-network-row').length;ui.click('browser-back');assert.equal(ui.d.getElementById('virtual-page').dataset.page,'start');assert.equal(ui.d.querySelectorAll('.studio-network-row').length,count,'back makes no HTTP request');
  ui.variant('fixed');await ui.submit('service-submit');assert.equal(ui.d.getElementById('virtual-page').dataset.page,'blocked',row.id);assert.match(ui.d.getElementById('browser-location').textContent,/northstar\.test\/redirect\//);assert.doesNotMatch(ui.d.getElementById('browser-location').textContent,/outside\.example/);
 }}finally{ui.dom.window.close();}
});
test('JWT editor preserves original signed bytes including whitespace, every normal and attack token; profile matches authorization',async()=>{
 const ui=await workspace();try{for(const row of cases.filter(c=>c.group==='jwt')){await ui.go(row);ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset');
 for(const mode of ['vulnerable','fixed']){ui.variant(mode);ui.click('studio-control');await ui.submit('jwt-send');assert.equal(JSON.parse(ui.d.getElementById('input').value).token,row.normal.token,row.id+' exact normal bytes');assert.equal(ui.d.getElementById('virtual-page').dataset.page,'authorized',row.id+' '+mode+' normal');}
 ui.w.document.getElementById('input').value=JSON.stringify(row.attack);ui.d.getElementById('input').dispatchEvent(new ui.w.Event('input'));ui.variant('vulnerable');await ui.submit('jwt-send');assert.equal(JSON.parse(ui.d.getElementById('input').value).token,row.attack.token);assert.equal(ui.d.getElementById('virtual-page').dataset.page,'authorized',row.id+' weak');ui.variant('fixed');await ui.submit('jwt-send');assert.equal(ui.d.getElementById('virtual-page').dataset.page,'denied',row.id+' fixed');assert.doesNotMatch(ui.d.getElementById('site-business-result').textContent,/DEMO_ALICE_PROFILE/);assert.equal(JSON.parse(ui.d.querySelector('#service-effect .result-details pre').textContent).data.private_profile,null);
 }
 const row=cases.find(c=>c.id==='jwt-signature');await ui.go(row);const head=Buffer.from('{ "alg" : "HS256", "typ" : "JWT" }').toString('base64url');const payload=Buffer.from(JSON.stringify(JSON.parse(Buffer.from(row.normal.token.split('.')[1],'base64url')),null,2)).toString('base64url');const {createHmac}=await import('node:crypto');const raw=head+'.'+payload+'.'+createHmac('sha256','between-bytes-public-training-key-only').update(head+'.'+payload).digest('base64url');ui.d.getElementById('input').value=JSON.stringify({token:raw});ui.d.getElementById('input').dispatchEvent(new ui.w.Event('input'));ui.variant('fixed');await ui.submit('jwt-send');assert.equal(JSON.parse(ui.d.getElementById('input').value).token,raw);assert.equal(ui.d.getElementById('virtual-page').dataset.page,'authorized');
 }finally{ui.dom.window.close();}
});
test('editing JWT claims requires an explicit training signature and isolates each claim check',async()=>{
 const ui=await workspace();const {webcrypto}=await import('node:crypto');Object.defineProperty(ui.w.crypto,'subtle',{value:webcrypto.subtle});try{for(const row of cases.filter(c=>['jwt-expiry','jwt-audience','jwt-issuer','jwt-purpose'].includes(c.id))){await ui.go(row);ui.click('studio-control');const attackClaims=JSON.parse(Buffer.from(row.attack.token.split('.')[1],'base64url'));ui.d.getElementById('jwt-claims').value=JSON.stringify(attackClaims);ui.variant('vulnerable');await ui.submit('jwt-send');assert.equal(ui.d.getElementById('virtual-page').dataset.page,'denied',row.id+' unsigned change');ui.click('jwt-sign');await until(()=>ui.d.getElementById('jwt-signature').value!==row.normal.token.split('.')[2],'signature');await ui.submit('jwt-send');assert.equal(ui.d.getElementById('virtual-page').dataset.page,'authorized',row.id+' signed weak');ui.variant('fixed');await ui.submit('jwt-send');assert.equal(ui.d.getElementById('virtual-page').dataset.page,'denied',row.id+' signed fixed');}}
 finally{ui.dom.window.close();}
});
test('each CSRF and CORS page shows its own mutation or readability result without leaking fixed private data',async()=>{
 const ui=await workspace();try{for(const row of cases.filter(c=>['csrf','cors'].includes(c.group))){await ui.go(row);ui.click('reset');await until(()=>!ui.d.getElementById('service-submit').disabled,'reset');ui.variant('fixed');ui.click('studio-control');await ui.submit('service-submit');assert.equal(ui.d.getElementById('virtual-page').dataset.page,row.group==='cors'?'readable':'saved',row.id+' control');
 ui.variant('vulnerable');ui.d.getElementById('input').value=JSON.stringify(row.attack);await ui.submit('service-submit');assert.equal(ui.d.getElementById('virtual-page').dataset.page,row.group==='cors'?'readable':'changed',row.id+' impact');const weak=ui.d.getElementById('virtual-page').textContent;ui.variant('fixed');await ui.submit('service-submit');assert.equal(ui.d.getElementById('virtual-page').dataset.page,'blocked',row.id+' fixed');assert.notEqual(ui.d.getElementById('virtual-page').textContent,weak,row.id+' page distinction');if(row.group==='cors'){assert.doesNotMatch(ui.d.getElementById('site-business-result').textContent,/DEMO_PRIVATE_CORS_DATA/);assert.equal(JSON.parse(ui.d.querySelector('#service-effect .result-details pre').textContent).data.private,null);};
 }}finally{ui.dom.window.close();}
});
test('editing an intercepted JWT updates the dedicated editor before sending from that editor',async()=>{
 const ui=await workspace();try{const row=cases.find(c=>c.id==='jwt-none');await ui.go(row);const item=ui.d.querySelector('.studio-field[data-key="token"]');item.querySelector('[data-value]').value=row.attack.token;item.querySelector('[data-value]').dispatchEvent(new ui.w.Event('input'));assert.equal(JSON.parse(ui.d.getElementById('jwt-header').value).alg,'none');await ui.submit('jwt-send');assert.equal(ui.d.getElementById('virtual-page').dataset.page,'authorized');assert.equal(JSON.parse(ui.d.getElementById('input').value).token,row.attack.token);}finally{ui.dom.window.close();}
});
test('all 108 applications have working page navigation without dispatching an engine operation',async()=>{
 const ui=await workspace();let operations=0;const original=ui.w.BBEngine.fetch;ui.w.BBEngine.fetch=async(path,...args)=>{if(String(path).startsWith('/academy/api/'))operations++;return original(path,...args);};
 try{for(const row of cases){await ui.go(row);assert.equal(ui.d.getElementById('service-ui').dataset.view,'home',row.id);const home=ui.d.getElementById('browser-location').textContent;assert.equal(new URL(home).pathname.startsWith('//'),false,row.id+' canonical page path');ui.click('site-open-details');assert.equal(ui.d.getElementById('service-ui').dataset.view,'details',row.id);assert.notEqual(ui.d.getElementById('browser-location').textContent,home,row.id);ui.d.querySelector('#site-details button').click();assert.equal(ui.d.getElementById('service-ui').dataset.view,'work',row.id);ui.click('browser-nav-back');assert.equal(ui.d.getElementById('service-ui').dataset.view,'details');ui.click('browser-nav-forward');assert.equal(ui.d.getElementById('service-ui').dataset.view,'work');ui.click('browser-reload');assert.equal(ui.d.getElementById('service-ui').dataset.view,'work');assert.ok(ui.d.querySelector('.guided-steps').children.length>=5,row.id+' guided steps');assert.equal([...ui.d.querySelectorAll('.lesson p')].filter(p=>p.textContent===ui.d.getElementById('case-story').textContent).length,1,row.id+' story appears once');assert.deepEqual([...ui.d.getElementById('studio-mode').options].map(o=>o.textContent),['تحتوي على مشكلة','بعد الإصلاح']);}assert.equal(operations,0);assert.deepEqual(ui.errors.map(e=>e.message),[]);}
 finally{ui.dom.window.close();}
});
test('application interception pauses before mutation and reload/back/forward never replay a payment operation',async()=>{
 const ui=await workspace();let operations=0;const original=ui.w.BBEngine.fetch;ui.w.BBEngine.fetch=async(path,...args)=>{if(String(path).startsWith('/academy/api/'))operations++;return original(path,...args);};
 try{await ui.go(cases.find(c=>c.id==='pay-price'));ui.click('site-open-work');ui.d.getElementById('site-intercept').checked=true;ui.d.getElementById('service-form').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));assert.equal(operations,0);assert.equal(ui.d.getElementById('studio-tab-fields').getAttribute('aria-selected'),'true');assert.equal(ui.d.getElementById('studio-panel-app').hidden,false);const field=ui.d.querySelector('[data-key="price"] [data-value]');field.value='1';field.dispatchEvent(new ui.w.Event('input'));await ui.submit('studio-submit');assert.equal(operations,1);assert.equal(ui.d.getElementById('service-ui').dataset.view,'result');assert.match(ui.d.getElementById('site-business-result').textContent,/order100/);const before=invoke({path:'/academy/resource?case=pay-price&mode=vulnerable'}).body.data.order.revision;ui.click('browser-reload');ui.click('browser-nav-back');ui.click('browser-nav-forward');assert.equal(operations,1);assert.equal(invoke({path:'/academy/resource?case=pay-price&mode=vulnerable'}).body.data.order.revision,before);ui.variant('fixed');assert.equal(ui.d.getElementById('service-ui').dataset.view,'work');assert.equal(ui.d.getElementById('site-business-result').textContent,'');await ui.submit('studio-submit');assert.match(ui.d.getElementById('site-business-result').textContent,/422/);assert.ok(ui.d.getElementById('flow-explanation').textContent);assert.ok(ui.d.querySelectorAll('#actual-stages li').length);}
 finally{ui.dom.window.close();}
});
test('a failed request cannot leave the preceding successful result presented as the current page',async()=>{
 const ui=await workspace();try{await ui.go(cases.find(c=>c.id==='pay-price'));ui.click('site-open-work');await ui.submit('service-submit');assert.match(ui.d.getElementById('site-business-result').textContent,/order100/);ui.d.getElementById('input').value='{}';await ui.submit('service-submit');assert.ok(ui.d.getElementById('service-error').textContent);assert.equal(ui.d.getElementById('site-business-result').textContent,'');assert.equal(ui.d.getElementById('service-ui').dataset.view,'work');assert.equal(ui.d.getElementById('site-result-link').disabled,true);}
 finally{ui.dom.window.close();}
});
test('browser execution observations replace the pending message on the content page',async()=>{
 const ui=await workspace();try{await ui.go(cases.find(c=>c.id==='xss-html'));ui.click('site-open-work');await ui.submit('service-submit');assert.match(ui.d.getElementById('site-result-summary').textContent,/بانتظار/);ui.w.BBExperience.browserObservation({executed:true});assert.match(ui.d.getElementById('site-result-summary').textContent,/رُصد تنفيذ JavaScript/);assert.doesNotMatch(ui.d.getElementById('site-result-summary').textContent,/بانتظار/);}
 finally{ui.dom.window.close();}
});
