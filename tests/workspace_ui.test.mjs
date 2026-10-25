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
