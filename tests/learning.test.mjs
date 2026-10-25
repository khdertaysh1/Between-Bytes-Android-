import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {loadPyodide} from 'pyodide';
const file=name=>readFile(new URL('../web/'+name,import.meta.url),'utf8');
const py=await loadPyodide();py.runPython(await file('engine/learner_runner.py'));
const run=(source,request={price:10000})=>{py.globals.set('_test',JSON.stringify({source,request}));return JSON.parse(py.runPython('run_student(_test)'));};
test('Python learner code runs branches, prints output and exposes actual line values without mutating its input',()=>{
 const input={price:10000};const result=run('if request["price"] > 1:\n    request["price"] = 1\nprint(request["price"])',input);assert.equal(result.request.price,1);assert.equal(input.price,10000);assert.equal(result.output,'1\n');assert.equal(result.error,null);assert.ok(result.trace.some(e=>e.line===2&&e.event==='line'&&e.values.request.includes('10000')));assert.ok(result.trace.some(e=>e.line===3&&e.values.request.includes(': 1}')));
});
test('code errors, invalid requests and huge output are bounded and explicit',()=>{
 for(const [source,type] of [['if :','SyntaxError'],['request["price"]=1\n1/0','ZeroDivisionError']]){const r=run(source);assert.equal(r.error.type,type);}
 assert.equal(run('request = [1, 2]').valid,false);assert.equal(run('request["x"] = float("nan")').valid,false);const r=run('for i in range(1000):\n    print("x"*200)');assert.equal(r.output.length,16000);assert.equal(r.truncated,true);assert.equal(r.trace.length,160);
});
test('actual engine trace names real source lines and disabling tracing leaves it absent',async()=>{
 py.FS.mkdirTree('/academy');for(const name of ['academy.py','academy_http.py','commerce.py','request_security.py','resource_labs.py','advanced_labs.py','academy_catalog.json','resource_catalog.json','advanced_catalog.json','wasm_api.py'])py.FS.writeFile('/academy/'+name,await file('engine/'+name));py.runPython("import sys;sys.path.insert(0,'/academy');from wasm_api import invoke");
 const invoke=request=>{py.globals.set('_req',JSON.stringify(request));return JSON.parse(py.runPython('invoke(_req)'));};
 for(const mode of ['vulnerable','fixed']){const r=invoke({path:'/academy/api/payment/pay-price/'+mode,method:'POST',input:{price:1},trace:true});assert.equal(r.status,mode==='fixed'?422:200);assert.ok(r.trace.events.some(e=>e.file==='commerce.py'&&e.function==='execute'&&e.values.fixed===(mode==='fixed'?'True':'False')));for(const e of r.trace.events){const lines=(await file('engine/'+e.file)).split('\n');assert.ok(e.line>0&&e.line<=lines.length);}}
 assert.equal(invoke({path:'/academy/api/payment/pay-price/fixed',method:'POST',input:{price:10000}}).trace,undefined);
});
test('startup failure stops loading and retry creates a fresh worker, ignoring late messages',async()=>{
 const dom=new JSDOM('<p id="runtime-status"></p>',{url:'https://academy.test/',runScripts:'outside-only'});const w=dom.window;const workers=[];class Worker{constructor(){workers.push(this);}postMessage(data){this.request=data;}terminate(){this.terminated=true;}}
 Object.assign(w,{Worker,Headers,Response,URLSearchParams,fetch:async()=>new Response('{}')});w.eval(await file('offline-bridge.js'));const first=w.BBEngine.prepare();assert.equal(w.document.documentElement.dataset.runtimeState,'loading');const a=workers[0];a.onmessage({data:{id:a.request.id,error:'missing runtime',startup:true}});await assert.rejects(first,/missing runtime/);assert.equal(a.terminated,true);assert.equal(w.document.documentElement.dataset.runtimeState,'error');const second=w.BBEngine.prepare();const b=workers[1];a.onmessage({data:{type:'progress',message:'old loading'}});assert.equal(w.document.documentElement.dataset.runtimeState,'loading');b.onmessage({data:{type:'ready'}});b.onmessage({data:{id:b.request.id,data:{ready:true}}});await second;assert.equal(w.document.documentElement.dataset.runtimeState,'ready');assert.equal(w.document.getElementById('runtime-status').hidden,true);dom.window.close();
});
test('old learning navigation and global engine banner are removed; legacy entry redirects to current labs',async()=>{
 const index=await file('index.html');assert.doesNotMatch(index,/href="\.\/learn.html"/);assert.doesNotMatch(index,/id="engine-status"/);const legacy=await file('learn.html');assert.match(legacy,/location.replace\('\.\/index.html'\)/);assert.doesNotMatch(legacy,/app.js|V0.1/);
});
