import {loadPyodide} from './vendor/pyodide/pyodide.mjs';
let python,ready,booted=false,queue=Promise.resolve();
const files=['challenges.py','academy.py','academy_http.py','commerce.py','request_security.py','resource_labs.py','academy_catalog.json','resource_catalog.json','advanced_labs.py','advanced_catalog.json','wasm_api.py'];
async function boot(){
 self.postMessage({type:'progress',message:'جارٍ تشغيل محرك Python وSQLite المحلي…'});
 python=await loadPyodide({indexURL:new URL('./vendor/pyodide/',self.location.href).href});
 python.FS.mkdirTree('/academy');
 await Promise.all(files.map(async file=>{const response=await fetch(new URL('./engine/'+file,self.location.href));if(!response.ok)throw Error('Missing engine asset: '+file);python.FS.writeFile('/academy/'+file,await response.text());}));
 python.runPython("import sys; sys.path.insert(0,'/academy'); from wasm_api import invoke");
 booted=true;self.postMessage({type:'ready'});
}
self.onmessage=event=>{const {id,request}=event.data;queue=queue.then(async()=>{try{ready??=boot();await ready;python.globals.set('_bb_request',JSON.stringify(request));const data=JSON.parse(python.runPython('invoke(_bb_request)'));self.postMessage({id,data});}catch(error){self.postMessage({id,error:String(error.message||error).slice(0,600),startup:!booted});}});};
