import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../web/sw.js',import.meta.url),'utf8');
function setup(){
 const handlers={},entries=new Map(),calls=[];let network=false;
 const key=r=>typeof r==='string'?r:r.url;
 const cache={match:async r=>entries.get(key(r)),put:async(r,v)=>entries.set(key(r),v)};
 const ctx={URL,Response,self:{registration:{scope:'https://academy.test/course/'},location:{origin:'https://academy.test'},addEventListener:(name,fn)=>handlers[name]=fn},caches:{open:async()=>cache,match:cache.match},fetch:async r=>{calls.push(r.url);if(!network)throw Error('Offline');return {ok:true,type:'basic',clone:()=>new Response('downloaded'),text:async()=> 'downloaded'};}};
 vm.runInNewContext(source,ctx);
 return {entries,calls,online:()=>network=true,request:async(path,navigate=false)=>{let answer;handlers.fetch({request:{url:'https://academy.test/course/'+path,method:'GET',mode:navigate?'navigate':'same-origin'},respondWith:p=>answer=p});return answer;}};
}
test('cached WASM and engine source load offline without waiting for any network request',async()=>{
 const s=setup();for(const asset of ['vendor/pyodide/pyodide.asm.wasm','engine/advanced_labs.py']){
 s.entries.set('https://academy.test/course/'+asset,new Response('cached'));
 assert.equal(await (await s.request(asset)).text(),'cached');}
 assert.equal(s.calls.length,0);
});
test('successful runtime download is persisted before completion; a later offline request reuses it',async()=>{
 const s=setup();s.online();await s.request('vendor/pyodide/python_stdlib.zip');
 assert.equal(s.calls.length,1);assert.equal(await (await s.request('vendor/pyodide/python_stdlib.zip')).text(),'downloaded');assert.equal(s.calls.length,1);
});
test('offline navigation falls back to cached shell, while missing scripts return a network error',async()=>{
 const s=setup();s.entries.set('./index.html',new Response('offline classroom'));
 assert.equal(await(await s.request('',true)).text(),'offline classroom');assert.equal((await s.request('missing.js')).type,'error');
});
test('updated entry points bypass old bare-URL caches and precache every referenced script/stylesheet for offline reload',async()=>{
 const context=vm.createContext({URL,self:{registration:{scope:'https://academy.test/course/'},location:{origin:'https://academy.test'},addEventListener:()=>{}}});
 vm.runInContext(source,context);const assets=vm.runInContext('ASSETS',context);
 for(const page of ['index.html','about.html','feedback.html','welcome.html','challenges.html']){
  const html=await readFile(new URL('../web/'+page,import.meta.url),'utf8');
  const refs=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"[^>]*>/g)].map(x=>x[1]).filter(x=>/\.(?:js|css)(?:\?|$)/.test(x));
  for(const ref of refs){assert.ok(assets.includes(ref),page+' offline asset '+ref);await readFile(new URL('../web/'+ref.split('?')[0].replace(/^\.\//,''),import.meta.url));}
  for(const ref of refs.filter(x=>/\/(?:academy|studio|experience|feedback)\.(?:js|css)/.test(x)&&!x.includes('studio.css')&&!x.includes('academy.css')))assert.match(ref,/\?v=web[\w.]+$/,page+' cache invalidation '+ref);
 }
});
test('service connection configuration refreshes online rather than staying stuck on an unconfigured cached copy',async()=>{
 const s=setup();s.entries.set('https://academy.test/course/services-config.js?v=web9',new Response('old unconfigured'));s.online();assert.equal(await(await s.request('services-config.js?v=web9')).text(),'downloaded');assert.equal(s.calls.length,1);
});
