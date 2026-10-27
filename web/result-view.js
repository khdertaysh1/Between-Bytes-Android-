/* Read-only application results. Values come from the engine, never from the selected mode. */
'use strict';
window.BBResultView=(()=>{
 const names={payment:['حالة الطلب والمعاملة','Order and transaction'],access:['المورد والصلاحيات','Resource and permissions'],rate:['سجل محاولات الدخول','Sign-in attempts'],xss:['المعاينة والتنفيذ','Rendering and execution'],code:['نتيجة العملية','Operation result'],ssrf:['نتيجة جلب الرابط','Fetch result'],redirect:['قرار وجهة التحويل','Redirect decision'],csrf:['حالة ملاحظة الحساب','Account note'],cors:['إتاحة قراءة البيانات','Data readability'],upload:['مكتبة الملفات','File library'],traversal:['المورد المطلوب','Requested file'],disclosure:['محتوى المورد','Resource content'],authentication:['حالة الحساب والجلسة','Account and session'],jwt:['التحقق من الرمز','Token verification'],assignment:['حالة الملف الشخصي','Profile state']};
 const labels={before:['قبل','Before'],after:['بعد','After'],content:['المحتوى','Content'],note:['الملاحظة','Note'],destination:['الوجهة','Destination'],authorized:['الوصول مسموح','Access authorized'],readable:['القراءة مسموحة','Readable'],private:['البيانات الخاصة','Private data'],private_profile:['الملف الخاص','Private profile'],owner:['المالك','Owner'],actor:['هوية الجلسة','Session actor'],remaining:['المحاولات المتبقية','Remaining attempts'],accepted_failed_attempts:['مرّت للتحقق','Reached verification'],blocked:['محاولات محجوبة','Blocked attempts'],amount_due_minor:['المبلغ المستحق بالسنت','Amount due in cents'],refunded_minor:['المبلغ المسترد بالسنت','Refunded cents'],captured_minor:['المبلغ المحصل بالسنت','Captured cents'],files:['الملفات المحفوظة','Stored files'],accounts:['سجل الحسابات','Account ledger'],changed:['تغيّرت البيانات','Data changed'],operation_applied:['نُفذت العملية','Operation applied'],checks_trace:['فحوص التحقق','Verification checks'],trace:['مسار المعالجة','Processing trace'],error_code:['سبب الرفض','Rejection reason'],data:['بيانات النتيجة','Result data']};
 const element=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const tx=(lang,ar,en)=>lang==='ar'?ar:en;
 function verdict(r,lang){
  if(r.browser?.runtimeError)return tx(lang,'خطأ أثناء عرض المعاينة؛ النتيجة غير محسومة','Preview runtime error; observation inconclusive');
  if(r.browser?.executed)return tx(lang,'رُصد تنفيذ JavaScript داخل الإطار المعزول','JavaScript execution observed in the sandbox');
  if(r.browser?.urlPolicy)return r.browser.dangerous?tx(lang,'سياسة الرابط سمحت بعنوان JavaScript','URL policy allowed a JavaScript address'):tx(lang,'سياسة الرابط لم تسمح بعنوان JavaScript','URL policy did not allow a JavaScript address');
  if(r.browser?.observed)return tx(lang,'اكتمل العرض؛ لم يُرصد alert خلال فترة المراقبة','Rendered; no alert observed during the observation window');
  if(r.preview)return tx(lang,'بانتظار نتيجة المتصفح؛ HTTP وحده لا يثبت XSS','Waiting for browser evidence; HTTP alone does not establish XSS');
  return r.protected?tx(lang,'مُنعت المحاولة المخالفة','Invalid operation blocked'):r.impact?tx(lang,'ظهر أثر يخالف قاعدة الأمان','Security invariant violated'):r.legitimate?tx(lang,'نجح الاستخدام السليم','Legitimate operation succeeded'):tx(lang,'نُفذ الطلب؛ راجع البيانات','Request completed; inspect the data');
 }
 function state(r){return r.browser?.executed||r.browser?.dangerous||r.impact?'impact':r.browser?.runtimeError?'error':r.protected?'protected':r.legitimate?'success':r.preview?'observation':'neutral';}
 function payload(r){if(r.response_body)return r.response_body;const skip=new Set(['case','mode','http_status','status','impact','protected','legitimate','checks','flag','request_id','synthetic','preview','token','verification','model','transport','browser']);const o={};for(const [k,v] of Object.entries(r))if(!skip.has(k))o[k]=v;return o;}
 function valueTree(value,lang,depth=0){
  if(value===null||value===undefined)return element('span',tx(lang,'غير متاح / لم يُرجع المورد','Unavailable / no resource returned'),'empty-value');
  if(typeof value!=='object')return element('span',typeof value==='boolean'?tx(lang,value?'نعم':'لا',value?'Yes':'No'):String(value));
  if(Array.isArray(value)&&!value.length)return element('p',tx(lang,'لا توجد نتائج','No results'),'empty-value');
  if(depth>5)return element('pre',JSON.stringify(value,null,2));
  const list=element('dl',undefined,'response-facts');for(const [k,v] of Object.entries(value)){if(['model','transport','request_id'].includes(k))continue;const term=element('dt',labels[k]?.[lang==='ar'?0:1]||k);const dd=element('dd');dd.dataset.resultKey=k;dd.append(valueTree(v,lang,depth+1));list.append(term,dd);}return list;
 }
 function draw(out,r,row,lang){
  out.hidden=false;out.replaceChildren();out.dataset.mode=r.mode;out.dataset.case=row.id;out.dataset.state=state(r);
  const head=element('div',undefined,'result-heading');head.append(element('span',r.mode==='fixed'?tx(lang,'النسخة بعد الإصلاح','After repair'):tx(lang,'النسخة التي تحتوي على مشكلة','Contains an issue'),'variant-tag'),element('span','HTTP '+(r.http_status??r.status),'http-chip'));out.append(head,element('h3',verdict(r,lang),'result-verdict'));
  const content=element('div',undefined,'result-content');content.append(element('h4',names[row.group][lang==='ar'?0:1]));
  if(r.preview){content.append(element('p',r.browser?verdict(r,lang):tx(lang,'تُعرض الحمولة في الإطار أدناه. قد يتشابه الشكل مع اختلاف التنفيذ؛ راقب دليل المتصفح.','The payload renders below. Appearance may match while execution differs; inspect browser evidence.')));}
  else content.append(valueTree(payload(r),lang));
  out.append(content);const details=element('details',undefined,'result-details');details.append(element('summary',tx(lang,'تفاصيل النتيجة من المحرك','Engine result details')),element('pre',JSON.stringify(r,null,2)));out.append(details);
 }
 function compare(out,pair,row,lang){
  out.replaceChildren();if(!pair.vulnerable&&!pair.fixed){out.hidden=true;return;}out.hidden=false;out.append(element('h3',tx(lang,'مقارنة لنفس جسم الطلب','Same request body comparison')),element('p',tx(lang,'نتائج إرسال فعلية؛ لكل نسخة حالة مستقلة. المقارنة تخص جسم JSON الحالي، وليست تشابه الشكل أو رمز HTTP فقط.','Actual submissions with independent variant state. Matches the current JSON body; compare data and behavior, not appearance or HTTP alone.'),'comparison-note'));
  if(pair.vulnerable&&pair.fixed)drawDifferences(out,pair,lang);
  const grid=element('div',undefined,'variant-comparison');for(const mode of ['vulnerable','fixed']){const card=element('article');card.dataset.comparisonMode=mode;const r=pair[mode];if(r)draw(card,r,row,lang);else card.append(element('h4',mode==='fixed'?tx(lang,'بعد الإصلاح','After repair'):tx(lang,'التي تحتوي على مشكلة','Contains an issue')),element('p',tx(lang,'لم يُرسل هذا الجسم لهذه النسخة في الجولة الحالية','This body has not been sent to this variant in the current round')));grid.append(card);}out.append(grid);
  const source=element('section',undefined,'variant-code-comparison');source.append(element('h3',tx(lang,'ما الذي تغيّر في التحقق؟','What changed in validation?')),element('p',tx(lang,'مقتطفات تعليمية تشرح القاعدة؛ المصدر المنفّذ وتتبّع أسطره في أداة «المصدر والتتبّع». تغيير المقتطف هنا ليس تشغيل كود.','Teaching snippets explain the rule; executed source and line events are in Source & trace. These snippets are not executable editors.')));
  const codes=element('div',undefined,'variant-comparison');const weak=String(row.lesson?.bad_code||''),fixed=String(row.lesson?.fixed_code||'');
  for(const [mode,code,other,explanation] of [['vulnerable',weak,fixed,row.cause?.[lang]],['fixed',fixed,weak,row.fix?.[lang]]]){const card=element('article',undefined,'variant-code-card');card.dataset.codeMode=mode;card.append(element('h4',mode==='fixed'?tx(lang,'التحقق بعد الإصلاح','Validation after repair'):tx(lang,'التحقق الناقص','Missing validation')),element('p',explanation||''));const pre=element('pre');pre.dir='ltr';for(const line of code.split('\n')){const span=element('span',line+'\n','code-diff-line');if(!other.split('\n').includes(line))span.classList.add(mode==='fixed'?'code-added':'code-removed');pre.append(span);}card.append(pre);codes.append(card);}source.append(codes);out.append(source);
 }
 // Compare business data, never ephemeral request/preview IDs or assessment labels.
 function normalized(value){
  if(Array.isArray(value))return value.map(normalized);
  if(value&&typeof value==='object'){const out={};for(const key of Object.keys(value).sort()){
   if(['request_id','preview_url','token','model','transport'].includes(key))continue;
   if(key==='id'&&typeof value[key]==='string'&&/^(txn|sub)_/.test(value[key]))continue;
   out[key]=normalized(value[key]);
  }return out;}return value;
 }
 function differences(left,right,path='$',rows=[]){
  if(JSON.stringify(left)===JSON.stringify(right))return rows;
  if(left&&right&&typeof left==='object'&&typeof right==='object'&&Array.isArray(left)===Array.isArray(right)){
   for(const key of new Set([...Object.keys(left),...Object.keys(right)]))differences(left[key],right[key],Array.isArray(left)?path+'['+key+']':path+'.'+key,rows);
  }else rows.push({path,left,right});return rows;
 }
 function drawDifferences(out,pair,lang){
  const weak=pair.vulnerable,fixed=pair.fixed,section=element('section',undefined,'response-delta');section.dataset.comparison='differences';
  section.append(element('h3',tx(lang,'الفرق المرصود في الصفحة والاستجابة','Observed page and response differences')));
  const facts=element('div',undefined,'comparison-outcomes');for(const r of [weak,fixed]){const card=element('article');card.dataset.observedMode=r.mode;card.append(element('h4',r.mode==='fixed'?tx(lang,'بعد الإصلاح','After repair'):tx(lang,'تحتوي على مشكلة','Contains an issue')),element('p',verdict(r,lang)),element('strong','HTTP '+(r.http_status??r.status)));facts.append(card);}section.append(facts);
  const rows=differences(normalized(payload(weak)),normalized(payload(fixed)));
  if(weak.resource_readback&&fixed.resource_readback){differences(normalized(weak.resource_readback),normalized(fixed.resource_readback),'GET.resource',rows);section.append(element('p',tx(lang,'حقول GET.resource من قراءة مستقلة للحالة المحفوظة بعد كل عملية.','GET.resource fields come from independent reads of saved state after each operation.')));}
  if(weak.preview||fixed.preview){const observed=r=>r.browser?{executed:!!r.browser.executed,runtimeError:!!r.browser.runtimeError,...(r.browser.urlPolicy?{dangerous:!!r.browser.dangerous}:{}),observed:!!r.browser.observed}:null;differences(observed(weak),observed(fixed),'browser',rows);section.append(element('p',tx(lang,'في XSS، HTML قد يبدو متشابهاً ورمز HTTP قد يتطابق؛ الفارق هو إدراج المدخل ورصد التنفيذ في الإطار. عدم الرصد محدود بهذه المحاولة.','XSS can look similar and share HTTP status; input insertion and observed frame execution distinguish the results. No-execution observations are bounded to this attempt.')));}
  const table=element('table',undefined,'response-diff-table');const head=element('thead'),tr=element('tr');for(const label of [tx(lang,'الحقل الذي تغيّر','Changed field'),tx(lang,'تحتوي على مشكلة','Contains an issue'),tx(lang,'بعد الإصلاح','After repair')]){const th=element('th',label);th.scope='col';tr.append(th);}head.append(tr);table.append(head);const body=element('tbody');
  const display=value=>value===undefined?tx(lang,'لم يُرجع الحقل','Field not returned'):value===null?'null':typeof value==='object'?JSON.stringify(value,null,2):String(value);
  for(const entry of rows.slice(0,60)){const line=element('tr');line.dataset.diffPath=entry.path;const key=element('th',entry.path);key.scope='row';key.dir='ltr';line.append(key);for(const value of [entry.left,entry.right])line.append(element('td',display(value)));body.append(line);}table.append(body);
  const sameStatus=(weak.http_status??weak.status)===(fixed.http_status??fixed.status);
  section.append(element('p',sameStatus?tx(lang,'رمز HTTP متطابق؛ افحص البيانات والسلوك أدناه.','HTTP status matches; inspect data and behavior below.'):tx(lang,'رمز HTTP مختلف؛ افحص أيضاً المورد والتغيير المحفوظ.','HTTP status differs; also inspect the resource and persisted change.')));
  if(rows.length)section.append(table);else section.append(element('p',tx(lang,'لا فرق في بيانات الأعمال المرصودة حتى الآن. الطلب السليم قد يعمل بنفس النتيجة في النسختين؛ لا يعني اختيار نسخة مختلفة وجود أثر أمني.','No observed business-data difference yet. A legitimate request can succeed identically in both variants; selecting another variant does not establish security impact.'),'comparison-identical'));
  if(rows.length>60)section.append(element('p',tx(lang,'عُرض أول 60 فرقاً؛ الاستجابتان الكاملتان أدناه.','First 60 differences shown; both full responses are below.')));
  const wire=element('details',undefined,'comparison-http');wire.append(element('summary',tx(lang,'الاستجابتان HTTP كما وصلتا','Both HTTP responses as received')));for(const r of [weak,fixed]){const label=r.mode==='fixed'?tx(lang,'بعد الإصلاح','After repair'):tx(lang,'تحتوي على مشكلة','Contains an issue');wire.append(element('h4',label));const pre=element('pre','HTTP '+(r.http_status??r.status)+'\n'+Object.entries(r.http_headers||{}).map(([k,v])=>k+': '+v).join('\n')+'\n\n'+JSON.stringify(r.response_body??payload(r),null,2));pre.dir='ltr';wire.append(pre);}section.append(wire);out.append(section);
 }
 return {draw,compare,verdict,state};
})();
