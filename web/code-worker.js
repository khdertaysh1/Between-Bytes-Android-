import {loadPyodide} from './vendor/pyodide/pyodide.mjs';
let python,ready;
async function boot(){
 python=await loadPyodide({indexURL:new URL('./vendor/pyodide/',self.location.href).href});
 const r=await fetch(new URL('./engine/learner_runner.py',self.location.href));if(!r.ok)throw Error('Code runner could not load');python.runPython(await r.text());
 // Code runs in its own worker. No lab state is loaded and outbound transports are disabled.
 self.fetch=()=>Promise.reject(Error('Network is disabled in code practice'));
 self.XMLHttpRequest=undefined;self.WebSocket=undefined;self.EventSource=undefined;self.Worker=undefined;
}
self.onmessage=async({data})=>{try{ready??=boot();await ready;self.postMessage({type:'running'});python.globals.set('_learner_input',JSON.stringify(data));const result=JSON.parse(python.runPython('run_student(_learner_input)'));self.postMessage({type:'result',result});}catch(error){self.postMessage({type:'error',message:String(error.message||error).slice(0,500)});}};
