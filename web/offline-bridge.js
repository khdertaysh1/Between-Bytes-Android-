'use strict';
window.BBEngine=(()=>{
 const nativeFetch=window.fetch.bind(window);
 let worker=null,serial=0;const requests=new Map();
 const status=(message,phase='loading')=>{document.documentElement.dataset.runtimeState=phase;const target=document.getElementById('runtime-status');if(target){target.hidden=phase==='ready'||phase==='idle';target.textContent=message;target.dataset.phase=phase;}};
 function abort(message){worker?.terminate();worker=null;for(const item of requests.values()){clearTimeout(item.timer);item.reject(Error(message));}requests.clear();status(message+' أعد إرسال الطلب للمحاولة من جديد.','error');}
 function ensure(){if(worker)return;status('تجهيز التجربة لأول تشغيل…');worker=new Worker(new URL('./engine-worker.js?v=web11.0',document.baseURI),{type:'module'});
 const active=worker;worker.onmessage=({data})=>{if(worker!==active)return;if(data.type==='progress'){status('تجهيز التجربة لأول تشغيل…');return;}if(data.type==='ready'){status('','ready');return;}const item=requests.get(data.id);if(!item)return;requests.delete(data.id);clearTimeout(item.timer);if(data.error){item.reject(Error(data.error));if(data.startup)abort('تعذر تجهيز التجربة. تحقق من الاتصال ثم أعد المحاولة.');}else{status('','ready');item.resolve(data.data);}};
 worker.onerror=()=>{if(worker===active)abort('تعذر تشغيل محرك المختبر. تحقق من اكتمال التحميل أو تحديث Android System WebView.');};
 }
 function call(request){ensure();const id=++serial;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>abort('انتهت مهلة تشغيل المحرك.'),60000);requests.set(id,{resolve,reject,timer});worker.postMessage({id,request});});}
 const labels={200:'OK',201:'Created',207:'Multi-Status',400:'Bad Request',401:'Unauthorized',403:'Forbidden',404:'Not Found',405:'Method Not Allowed',415:'Unsupported Media Type',422:'Unprocessable Content',429:'Too Many Requests'};
 async function transport(path,options={}){
  const url=new URL(path,document.baseURI);if(url.origin===location.origin&&url.pathname.startsWith('/studio/'))return nativeFetch(path,options);
  if(path==='/rooms/session')return new Response('{"local":true}',{headers:{'Content-Type':'application/json'}});
  if(path==='/academy/catalog'){const results=await Promise.all(['academy_catalog.json','resource_catalog.json','advanced_catalog.json'].map(file=>nativeFetch(new URL('./engine/'+file,document.baseURI)).then(r=>{if(!r.ok)throw Error('Content could not load');return r.json();})));return new Response(JSON.stringify({cases:results.flat()}),{headers:{'Content-Type':'application/json'}});}
  if(!String(path).startsWith('/academy/'))throw Error('Only local Academy routes are supported');
  const request={trace:String(path).startsWith('/academy/api/')&&!!document.getElementById('trace-enabled')?.checked,path,method:options.method||'GET',headers:Object.fromEntries(new Headers(options.headers||{}))};
  if(options.body instanceof URLSearchParams)request.fields=Object.fromEntries(options.body);else if(options.body){if(options.body.length>32768)throw Error('Request too large');try{request.input=JSON.parse(options.body);}catch{throw Error('JSON body is invalid');}}
  const data=await call(request);const response=new Response(JSON.stringify(data.body),{status:data.status,statusText:labels[data.status]||'',headers:data.headers});response.bbTrace=data.trace;return response;
 }
 document.addEventListener('DOMContentLoaded',()=>{status('','idle');if('serviceWorker'in navigator&&location.hostname!=='appassets.androidplatform.net')navigator.serviceWorker.register('./sw.js').catch(()=>{});});
 return {fetch:transport,preview:async token=>(await call({action:'preview',token})).html,prepare:()=>call({action:'health'}),reset:()=>abort('بدأت جلسة محرك جديدة.')};
})();
