// Local teaching models. These functions do not fetch URLs or read browser cookies.
export function webAddress(raw){
 if(typeof raw!=='string'||raw.length>2048)throw Error('Use a bounded absolute HTTP or HTTPS URL.');
 const url=new URL(raw);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Use HTTP or HTTPS without embedded credentials.');
 return {scheme:url.protocol.slice(0,-1),host:url.hostname,port:url.port||(url.protocol==='https:'?'443':'80'),origin:url.origin,path:url.pathname,query:url.search,fragment:url.hash,httpTarget:url.pathname+url.search};
}
export function inspectJson(raw){
 if(typeof raw!=='string'||raw.length>4096)throw Error('JSON limit: 4096 characters.');
 const value=JSON.parse(raw),type=v=>v===null?'null':Array.isArray(v)?'array':typeof v;
 return {value,rootType:type(value),fields:value&&typeof value==='object'&&!Array.isArray(value)?Object.entries(value).map(([name,v])=>({name,type:type(v),value:v})):[]};
}
export function courseContract(value){
 const errors=[];
 if(!value||typeof value!=='object'||Array.isArray(value))return {valid:false,errors:['object']};
 if(Object.keys(value).some(key=>!['quantity','note'].includes(key)))errors.push('unknown');
 if(!Number.isInteger(value.quantity)||value.quantity<1||value.quantity>5)errors.push('quantity');
 if(typeof value.note!=='string'||value.note.length>80)errors.push('note');
 return {valid:errors.length===0,errors};
}
export function authorize(session,resource,claimed,trustClient=false){
 if(!['anonymous','alice'].includes(session)||!['alice','bob'].includes(resource)||typeof claimed!=='string'||claimed.length>80)throw Error('Unknown identity fixture.');
 if(session==='anonymous')return {status:401,session:null,effectiveActor:null,allowed:false,content:null};
 const effectiveActor=trustClient?claimed:session,allowed=effectiveActor===resource;
 return {status:allowed?200:403,session,effectiveActor,allowed,content:allowed?'DEMO_'+resource.toUpperCase()+'_DOCUMENT':null};
}
export function originAndFlags(page,target,{httpOnly=true,secure=true}={}){
 const a=webAddress(page),b=webAddress(target);
 return {page:a.origin,target:b.origin,sameOrigin:a.origin===b.origin,javascriptMayReadCookie:!httpOnly,secureRequirementMet:!secure||b.scheme==='https',cookieSent:'not determined: Domain, Path, SameSite, credentials and other browser policies are not simulated'};
}
export function httpExchange({method,path,session,body},notes=[]){
 if(!['GET','POST'].includes(method)||typeof path!=='string'||path.length>120||!['anonymous','alice'].includes(session))throw Error('Invalid HTTP exercise fields.');
 let status=200,data,headers={'Content-Type':'application/json'},next=notes;
 const notePath=/^\/notes\/([1-9]\d{0,2})$/.exec(path),known=['/catalog','/notes','/documents/alice','/documents/bob'].includes(path)||!!notePath;
 if(!known){status=404;data={error:'not_found'};}
 else if(path!=='/notes'&&method!=='GET'){status=405;headers.Allow='GET';data={error:'method_not_allowed'};}
 else if(path==='/catalog')data={products:[{id:'COURSE',price_minor:10000,currency:'USD'}]};
 else if(session==='anonymous'){status=401;data={error:'sign_in_required'};}
 else if(notePath){const note=notes.find(n=>n.id===Number(notePath[1]));if(note)data=note;else{status=404;data={error:'note_not_found'};}}
 else if(path.startsWith('/documents/')){const result=authorize(session,path.split('/').at(-1),'alice');status=result.status;data={content:result.content,error:result.allowed?null:'forbidden'};}
 else if(method==='GET')data={notes};
 else{
  let parsed;try{parsed=inspectJson(body).value;}catch{status=400;data={error:'invalid_json'};}
  if(status===200){if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||Object.keys(parsed).length!==1||typeof parsed.message!=='string'||!parsed.message.trim()||parsed.message.length>80){status=422;data={error:'message_must_be_text_1_to_80'};}
   else if(notes.length>=10){status=409;data={error:'model_note_limit_reset_exercise'};}
   else{data={id:notes.length+1,message:parsed.message};next=[...notes,data];status=201;headers.Location='/notes/'+data.id;}}
 }
 return {request:{method,path,headers:method==='POST'?{'Content-Type':'application/json'}:{},body:method==='POST'?body:null},response:{status,headers,data},notes:next};
}
export function quotation(input,fixed){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['price','quantity'].includes(k))||!Number.isSafeInteger(input.price)||input.price<0||input.price>1000000||!Number.isInteger(input.quantity)||input.quantity<1||input.quantity>5)return {status:422,accepted:false,reason:'invalid_fields'};
 if(fixed&&input.price!==10000)return {status:422,accepted:false,reason:'catalog_price_mismatch'};
 return {status:200,accepted:true,unitPrice:fixed?10000:input.price,total:(fixed?10000:input.price)*input.quantity};
}
