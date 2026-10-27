import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const source=await readFile(new URL('../web/result-view.js',import.meta.url),'utf8');
const row={id:'example',group:'cors',cause:{ar:'تحقق ناقص',en:'Missing check'},fix:{ar:'تحقق من الأصل',en:'Validate origin'},lesson:{bad_code:'return input',fixed_code:'validate(input)\nreturn safe'}};
function render(pair,lang='en'){
 const dom=new JSDOM('<section id="out"></section>',{runScripts:'outside-only'});dom.window.eval(source);const out=dom.window.document.getElementById('out');dom.window.BBResultView.compare(out,pair,row,lang);return {dom,out};
}
const result=(mode,data,extra={})=>({mode,status:200,http_status:200,response_body:{data,request_id:mode},...extra});
test('equal HTTP codes still expose actual readability and private-data differences',()=>{
 const {dom,out}=render({vulnerable:result('vulnerable',{readable:true,private:'DEMO_PRIVATE'}),fixed:result('fixed',{readable:false,private:null},{protected:true})});try{
  assert.ok(out.querySelector('[data-diff-path="$.data.readable"]'));assert.ok(out.querySelector('[data-diff-path="$.data.private"]'));assert.match(out.textContent,/HTTP status matches/);assert.equal(out.querySelectorAll('[data-code-mode]').length,2);assert.ok(out.querySelector('.code-added'));assert.ok(out.querySelector('.code-removed'));
 }finally{dom.window.close();}
});
test('request IDs, preview URLs and JSON key order do not fabricate a business-data difference',()=>{
 const {dom,out}=render({vulnerable:result('vulnerable',{b:2,a:1,preview_url:'/one'}),fixed:result('fixed',{a:1,b:2,preview_url:'/two'})});try{
  assert.equal(out.querySelectorAll('[data-diff-path]').length,0);assert.match(out.querySelector('.comparison-identical').textContent,/No observed business-data difference/);
 }finally{dom.window.close();}
});
test('missing, null, false and zero remain distinct, and untrusted results render as text',()=>{
 const attack='<img src=x onerror=alert(1)>';
 const {dom,out}=render({vulnerable:result('vulnerable',{missing:null,flag:false,total:0,content:attack}),fixed:result('fixed',{flag:null,total:false,content:'safe'})});try{
  assert.ok(out.querySelector('[data-diff-path="$.data.missing"]'));assert.ok(out.querySelector('[data-diff-path="$.data.flag"]'));assert.ok(out.querySelector('[data-diff-path="$.data.total"]'));assert.equal(out.querySelector('img'),null);assert.ok(out.textContent.includes(attack));assert.match(out.textContent,/Field not returned/);
 }finally{dom.window.close();}
});
test('browser observations and independent readback differences stay separate from HTTP body data',()=>{
 const weak=result('vulnerable',{}, {preview:'/one',browser:{executed:true,observed:true},resource_readback:{balance:-2000}}),fixed=result('fixed',{}, {preview:'/two',browser:{executed:false,observed:true},resource_readback:{balance:4000}});
 const {dom,out}=render({vulnerable:weak,fixed});try{
  assert.ok(out.querySelector('[data-diff-path="browser.executed"]'));assert.ok(out.querySelector('[data-diff-path="GET.resource.balance"]'));assert.match(out.textContent,/independent reads/);assert.match(out.textContent,/bounded to this attempt/);
 }finally{dom.window.close();}
});
test('an unsent variant never acquires a response or a fabricated difference table',()=>{
 const {dom,out}=render({vulnerable:result('vulnerable',{value:1})});try{
  assert.equal(out.querySelector('.response-delta'),null);assert.equal(out.querySelector('[data-comparison-mode=fixed]').dataset.state,undefined);assert.match(out.textContent,/has not been sent/);
 }finally{dom.window.close();}
});
