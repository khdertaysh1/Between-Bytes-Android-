import test from 'node:test';
import assert from 'node:assert/strict';
import {CASES,starter,wire,parseRequest,classify,testVectors,ORIGIN} from '../web/navigation-model.js';
function run(item,next,fixed=false){const trace=[];const fn=new Function('request','trace',starter(item,fixed));return {response:classify(fn(parseRequest(wire(next)),(label,values)=>trace.push({label,values}))),trace};}
for(const item of CASES){
 test(item.id+': weak control works, the case-specific bypass escapes, and fixed logic preserves legitimate navigation',()=>{
  assert.equal(run(item,'/account').response.location,ORIGIN+'/account');
  const attack=run(item,item.attack);assert.equal(attack.response.status,302);assert.equal(attack.response.external,true);
  assert.equal(run(item,item.attack,true).response.status,403);
  for(const v of testVectors(item)){const r=run(item,v.next,true).response;assert.equal(r.status,v.allow?302:403,v.label);if(v.allow)assert.equal(new URL(r.location).pathname,new URL(v.next,ORIGIN).pathname);}
  assert.ok(attack.trace.some(x=>x.label==='parsed'));
 });
}
test('cases have different validation boundaries rather than a shared hardcoded attack comparison',()=>{
 assert.equal(run(CASES[0],'https://different.example/path').response.external,true);
 assert.equal(run(CASES[1],'https://different.example/path').response.status,403);
 assert.equal(run(CASES[1],'//different.example/path').response.external,true);
 assert.equal(run(CASES[2],'//different.example/path').response.status,403);
 const nested=run(CASES[5],CASES[5].attack);assert.ok(nested.trace.some(x=>x.label==='nested'&&x.values.href==='https://outside.example/landing'));
});
test('GET wire format round-trips encoded next including backslashes, percent literals and nested query strings',()=>{
 for(const item of CASES){const req=parseRequest(wire(item.attack));assert.equal(new URL(req.url).searchParams.get('next'),item.attack);}
 for(const bad of ['POST /login HTTP/1.1\nHost: app.lab','GET //evil.test/login HTTP/1.1\nHost: app.lab','GET /login HTTP/1.1\nHost: evil.test','GET /login HTTP/1.1\nHost: app.lab\nHost: app.lab'])assert.throws(()=>parseRequest(bad));
});
test('edited code controls the actual response and invalid destinations do not become browser navigation',()=>{
 const fn=new Function('request','trace',"return {status:403,body:'My patch'};");assert.equal(classify(fn({},()=>{})).body,'My patch');
 for(const value of [{status:302,location:'javascript:alert(1)'},{status:302,location:'/account\r\nX-Test:1'},{status:302},{status:'302'}])assert.throws(()=>classify(value));
 assert.equal(classify({status:302,location:'/welcome'}).external,false);
});
