'use strict';
window.BBStudent=(()=>{
 const VERSION='0.16.0',MAX=1048576,$=id=>document.getElementById(id);
 const copy=(lang,ar,en)=>lang==='en'?en:ar;
 const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const stages=[
  {groups:['payment','access','assignment'],ar:'1 · الطلب وحدود الثقة',en:'1 · Requests and trust boundaries',pre:['JSON، حقول الطلب، هوية المستخدم','JSON, request fields, user identity'],goal:['ميّز بيانات العميل عن قرار الخادم؛ أثبت تغيير السعر أو الوصول لمورد مستخدم آخر.','Separate client data from server decisions; demonstrate price or ownership violations.']},
  {groups:['authentication','jwt','rate'],ar:'2 · الهوية والجلسات',en:'2 · Identity and sessions',pre:['الجلسة، التوقيع، رموز HTTP','Sessions, signatures, HTTP status codes'],goal:['اختبر صلاحية الجلسة والرمز وحدود المحاولات مع الحفاظ على الاستخدام السليم.','Test sessions, tokens and attempt budgets while preserving legitimate access.']},
  {groups:['xss','code'],ar:'3 · البيانات والتفسير',en:'3 · Data and interpretation',pre:['HTML وJavaScript، أساسيات الاستعلامات','HTML and JavaScript, query basics'],goal:['تتبّع كيف تتحول البيانات إلى تركيب ينفذه مفسّر أو يعرضه المتصفح.','Trace how input becomes interpreter syntax or browser content.']},
  {groups:['redirect','traversal','upload','disclosure'],ar:'4 · الوجهات والموارد',en:'4 · Destinations and resources',pre:['URL، المسارات، أنواع الملفات','URLs, paths, file types'],goal:['قارن الوجهة أو المورد الفعلي بالقيمة التي اجتازت التحقق.','Compare the actual destination or resource with the validated value.']},
  {groups:['csrf','cors','ssrf'],ar:'5 · سياسات الطلبات',en:'5 · Request policies',pre:['Origin، Cookies، DNS، HTTP','Origins, cookies, DNS, HTTP'],goal:['حلّل السياسات وحدود النموذج؛ هذه الحالات لا تثبت عبور شبكة خارجية.','Analyze policies and model limits; these cases do not prove external network access.']}
 ];
 let bridge,rows=[],language='ar',pending=null;
 function hint(row,lang,index){
  const fields=[...new Set([...Object.keys(row.normal),...Object.keys(row.attack)])].join(', ');
  return [copy(lang,'ابدأ بطلب سليم بعد الإصلاح، وحدد القاعدة: ','Start with a fixed control. Identify the invariant: ')+row.cause[lang],
   copy(lang,'افحص الحقول: ','Inspect fields: ')+fields+'. '+copy(lang,'غيّر قيمة واحدة، ثم قارن البيانات والأثر لنفس المدخل في النسختين. HTTP 200 وحده لا يثبت نجاح الهجوم.','Change one value, then compare data and effect for identical input in both variants. HTTP 200 alone does not establish impact.'),
   copy(lang,'مثال محلول للمقارنة، لا يُرسل تلقائياً:\n','Worked example for comparison; it is not sent automatically:\n')+JSON.stringify(row.attack,null,2)+'\n'+row.fix[lang]][Math.min(index,2)];
 }
 function render(catalog,lang,api){
  rows=catalog;language=lang;bridge=api;
  const host=$('student-path');if(!host)return;
  const tx=(ar,en)=>copy(lang,ar,en);host.replaceChildren();const basics={'basics-optional':tx('اختياري · للمبتدئ وللمراجعة','Optional · beginner lessons and refresher'),'basics-title':tx('إذا كنت بحاجة إلى الأساسيات قبل البدء، فهذا تذكير بالأساسيات.','Need the basics before starting? Here is a refresher.'),'basics-copy':tx('شرح من الصفر وتجارب صغيرة لفهم الطلبات والبيانات والجلسات قبل أول مختبر. إذا كنت تعرفها، تابع مباشرةً إلى المختبرات.','Start from zero with small exercises on requests, data and sessions. If you know these concepts, continue directly to labs.'),'basics-start':tx('راجع الأساسيات من الصفر','Review the basics from zero'),'basics-skip':tx('لدي خبرة · تابع إلى المختبرات ←','I have experience · continue to labs →'),'labs':tx('اختر مختبراً','Choose a lab')};for(const [id,text]of Object.entries(basics))if($(id))$(id).textContent=text;if($('basics-start'))$('basics-start').href='./foundations.html'+(lang==='en'?'?lang=en':'');
  host.append(node('h2',tx('مسار المختبرات العملي','Practical lab path')),node('p',tx('طبّق معرفتك عبر خمس مراحل، أو اختر أي مختبر مباشرةً. كل المراحل مفتوحة ويمكنك استكمالها بأي ترتيب.','Apply your knowledge across five stages, or choose any lab directly. All stages are open and can be completed in any order.')));
  const challenges=node('a',tx('اختبر فهمك بالتحديات المستقلة ←','Test your understanding with independent challenges →'));challenges.href='./challenges.html'+(lang==='en'?'?lang=en':'');challenges.className='student-challenge-link';host.append(challenges);
  const list=node('ol');list.className='student-stages';
  for(const stage of stages){const items=rows.filter(r=>stage.groups.includes(r.group)),done=items.filter(r=>api.completed().includes(r.id)).length;
   const li=node('li');li.append(node('h3',lang==='en'?stage.en:stage.ar),node('p',stage.goal[lang==='en'?1:0]),node('p',tx('المتطلبات: ','Prerequisites: ')+stage.pre[lang==='en'?1:0]),node('small',tx('وقت مقترح للحالة: 10–20 دقيقة · ','Suggested per case: 10–20 minutes · ')+done+' / '+items.length));
   const next=items.find(r=>!api.completed().includes(r.id))||items[0];if(next){const a=node('a',tx('ابدأ / استكمل المرحلة','Start / resume stage'));a.href='#/'+next.group+'/'+next.id;li.append(a);}list.append(li);
  }host.append(list);
  const help=node('details');help.append(node('summary',tx('كيف أستخدم أدوات المختبر؟','How do I use the lab tools?')));const welcome=node('a',tx('جولة في الإرسال والتعديل والمقارنة · 5–10 دقائق ←','Tour sending, editing and comparing requests · 5–10 minutes →'));welcome.href='./welcome.html'+(lang==='en'?'?lang=en':'');const helpCopy=node('p');helpCopy.append(welcome);help.append(helpCopy);host.append(help);
  const safety=node('details');safety.append(node('summary',tx('حفظ التقدم ونسخة احتياطية','Progress storage and backup')),node('p',tx('علامات الإنجاز محلية للتعلّم. الحساب يزامن العلامات؛ المسودات والملاحظات تبقى على هذا الجهاز. نزّل نسخة قبل مسح بيانات المتصفح. ملف النسخة قد يتضمن ما كتبته في المسودات والملاحظات؛ احتفظ به لنفسك. الاستعادة تدمج في تقدم الضيف فقط، ولا تمنح شهادة أو ترسل إنجازات إلى الحساب.','Completion marks support self-study. Accounts sync marks; drafts and notes stay on this device. Back up before clearing browser data. Backups can contain your draft inputs and notes; keep them private. Restore merges into guest progress only and does not certify or upload account completion.')));
  const exportButton=node('button',tx('تنزيل نسخة احتياطية','Download backup'));exportButton.type='button';exportButton.onclick=()=>{try{api.flush();const data=backup();const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download='between-bytes-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){$('student-backup-status').textContent=e.message;}};
  const label=node('label',tx('اختر نسخة لمعاينتها قبل الاستعادة','Choose a backup to preview before restoring')),input=node('input');input.type='file';input.accept='.json,application/json';input.id='student-import';label.append(input);
  const status=node('p');status.id='student-backup-status';status.setAttribute('role','status');const apply=node('button',tx('دمج النسخة في تقدم الضيف','Merge backup into guest progress'));apply.type='button';apply.disabled=true;apply.id='student-restore';pending=null;
  input.onchange=async()=>{pending=null;apply.disabled=true;try{const file=input.files?.[0];if(!file)return;if(file.size>MAX)throw Error(tx('الملف أكبر من 1 MB.','File exceeds 1 MB.'));const data=validate(await file.text(),rows);pending=data;status.textContent=tx('المعاينة: ','Preview: ')+data.completed.length+tx(' علامة، ',' marks, ')+Object.keys(data.notes).length+tx(' ملاحظة. ستُحفظ القيم الموجودة عند التعارض.',' notes. Existing values win conflicts.');apply.disabled=false;}catch(e){status.textContent=e.message;}};
  apply.onclick=()=>{if(!pending)return;try{api.flush();restore(pending);pending=null;apply.disabled=true;status.textContent=tx('تم الدمج في تقدم الضيف. إن كنت مسجلاً، سجّل الخروج لرؤيته؛ لم نرسل شيئاً للحساب.','Merged into guest progress. If signed in, sign out to see it; nothing was sent to your account.');api.refresh();}catch(e){status.textContent=e.message;}};
  safety.append(exportButton,label,apply,status);host.append(safety);
 }
 function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}}
 function backup(){const snapshot=bridge.snapshot?.()||{notes:read('bb-academy-notes-v1',{}),drafts:read('bb-drafts-v1',{})};return validate(JSON.stringify({format:'between-bytes-progress',schema:1,version:VERSION,completed:bridge.completed(),...snapshot}),rows);}
 function validate(text,catalog){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX)throw Error('Backup exceeds 1 MB.');
  const data=JSON.parse(text),valid=new Set(catalog.map(r=>r.id));
  if(!data||data.format!=='between-bytes-progress'||data.schema!==1||!Array.isArray(data.completed)||data.completed.some(id=>typeof id!=='string'||!valid.has(id)))throw Error('Unsupported backup or unknown cases.');
  const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
  if(!object(data.notes)||!object(data.drafts))throw Error('Invalid notes or drafts.');
  const notes={},drafts={};for(const [id,value] of Object.entries(data.notes)){if(!valid.has(id)||typeof value!=='string'||value.length>10000)throw Error('Invalid note.');notes[id]=value;}
  for(const [id,value] of Object.entries(data.drafts)){if(!valid.has(id)||!object(value)||typeof value.input!=='string'||value.input.length>32768||!['fixed','vulnerable'].includes(value.mode))throw Error('Invalid draft.');drafts[id]={input:value.input,mode:value.mode};}
  return {format:'between-bytes-progress',schema:1,version:VERSION,completed:[...new Set(data.completed)],notes,drafts};
 }
 function restore(data){
  const keys=['bb-academy-marks-v1','bb-academy-notes-v1','bb-drafts-v1'],previous=keys.map(k=>localStorage.getItem(k));
  const values=[{...Object.fromEntries(data.completed.map(id=>[id,true])),...read(keys[0],{})},{...data.notes,...read(keys[1],{})},{...data.drafts,...read(keys[2],{})}];
  try{keys.forEach((key,i)=>localStorage.setItem(key,JSON.stringify(values[i])));}catch(error){keys.forEach((key,i)=>{try{if(previous[i]===null)localStorage.removeItem(key);else localStorage.setItem(key,previous[i]);}catch{}});throw Error('Storage unavailable or full; backup was not restored.');}
 }
 function route(row,lang){
  const link=$('feedback-link');if(link){const url=new URL('./feedback.html',document.baseURI);url.searchParams.set('version',VERSION);if(row)url.searchParams.set('case',row.id);link.href=url.href;link.textContent=copy(lang,'بلّغ عن مشكلة','Report a problem');}
  const context=$('student-context');if(!context||!row)return;
  context.replaceChildren();const info=node('p',copy(lang,'التنفيذ: Python محلي داخل المتصفح. الردود ينشئها محوّل HTTP محلي؛ ليست طلبات لسيرفر خارجي.','Execution: local Python in your browser. A local HTTP adapter constructs responses; these are not external server requests.'));
  if(['csrf','cors','ssrf','redirect'].includes(row.group))info.textContent=copy(lang,'التنفيذ: نموذج سياسة محلي محدود. لا يختبر عبور شبكة خارجية أو حماية المتصفح الفعلية عبر أصلين.','Execution: a bounded local policy model. It does not test external transport or actual cross-origin browser enforcement.');
  const report=node('a',copy(lang,'بلّغ عن مشكلة بهالحالة','Report a problem with this case'));report.href=link.href;const logic=node('button',copy(lang,'افتح منطق الثغرة والإصلاح','Open vulnerable and repaired logic'));logic.type='button';logic.onclick=()=>{document.getElementById('studio-tab-learning')?.click();document.getElementById('studio-panel-learning')?.scrollIntoView({block:'start'});};context.append(info,logic,report);
 }
 return {render,route,hint,validate,backup,restore};
})();
