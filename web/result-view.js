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
  const head=element('div',undefined,'result-heading');head.append(element('span',r.mode==='fixed'?tx(lang,'النسخة المُصلحة','Fixed variant'):tx(lang,'النسخة الضعيفة','Vulnerable variant'),'variant-tag'),element('span','HTTP '+(r.http_status??r.status),'http-chip'));out.append(head,element('h3',verdict(r,lang),'result-verdict'));
  const content=element('div',undefined,'result-content');content.append(element('h4',names[row.group][lang==='ar'?0:1]));
  if(r.preview){content.append(element('p',r.browser?verdict(r,lang):tx(lang,'تُعرض الحمولة في الإطار أدناه. قد يتشابه الشكل مع اختلاف التنفيذ؛ راقب دليل المتصفح.','The payload renders below. Appearance may match while execution differs; inspect browser evidence.')));}
  else content.append(valueTree(payload(r),lang));
  out.append(content);const details=element('details',undefined,'result-details');details.append(element('summary',tx(lang,'تفاصيل النتيجة من المحرك','Engine result details')),element('pre',JSON.stringify(r,null,2)));out.append(details);
 }
 function compare(out,pair,row,lang){
  out.replaceChildren();if(!pair.vulnerable&&!pair.fixed){out.hidden=true;return;}out.hidden=false;out.append(element('h3',tx(lang,'مقارنة لنفس جسم الطلب','Same request body comparison')),element('p',tx(lang,'نتائج إرسال فعلية؛ لكل نسخة حالة مستقلة. المقارنة تخص جسم JSON الحالي، وليست تشابه الشكل أو رمز HTTP فقط.','Actual submissions with independent variant state. Matches the current JSON body; compare data and behavior, not appearance or HTTP alone.'),'comparison-note'));
  const grid=element('div',undefined,'variant-comparison');for(const mode of ['vulnerable','fixed']){const card=element('article');card.dataset.comparisonMode=mode;const r=pair[mode];if(r)draw(card,r,row,lang);else card.append(element('h4',mode==='fixed'?tx(lang,'المُصلحة','Fixed'):tx(lang,'الضعيفة','Vulnerable')),element('p',tx(lang,'لم يُرسل هذا الجسم لهذه النسخة في الجولة الحالية','This body has not been sent to this variant in the current round')));grid.append(card);}out.append(grid);
 }
 return {draw,compare,verdict};
})();
