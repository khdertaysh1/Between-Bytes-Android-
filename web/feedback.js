'use strict';
(()=>{
 const $=id=>document.getElementById(id),client=window.BBServiceClient;
 const selected=new URLSearchParams(location.search).get('case')||'';$('feedback-case').value=selected.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
 const version=(new URLSearchParams(location.search).get('version')||'0.22.0').replace(/[^0-9.]/g,'').slice(0,20);
 $('feedback-context').textContent='Web '+version+' · Case: '+($('feedback-case').value||'General');
 let submission=null,sending=false;
 const content=()=>({kind:$('feedback-kind').value,title:$('feedback-title').value.trim(),message:$('feedback-message').value.trim(),case_id:$('feedback-case').value.trim(),email:$('feedback-email').value.trim(),website:$('feedback-website').value});
 const fallback=()=>{const d=content();$('feedback-context').textContent='Web '+version+' · Case: '+(d.case_id||'General');const url=new URL('https://github.com/khdertaysh1/Between-Bytes-Android-/issues/new');url.searchParams.set('title','[Web '+d.kind+'] '+d.title);url.searchParams.set('body','Case: '+(d.case_id||'General')+'\nWeb: '+version+'\n\n'+d.message);$('feedback-github').href=url.href;};
 $('feedback-form').addEventListener('input',()=>{submission=null;$('feedback-result').textContent='';fallback();});
 if(!client?.configured){$('feedback-availability').hidden=false;$('feedback-submit').disabled=true;$('feedback-alternative').open=true;}fallback();
 $('feedback-copy').onclick=async()=>{try{const d=content();await navigator.clipboard.writeText(d.title+'\n'+d.case_id+'\n\n'+d.message);$('feedback-result').textContent='تم نسخ النص. لم تُرسل الملاحظة.';}catch{$('feedback-result').textContent='تعذّر النسخ التلقائي؛ يمكنك تحديد النص ونسخه يدوياً.';}};
 $('feedback-form').onsubmit=async event=>{event.preventDefault();if(sending||!$('feedback-form').reportValidity())return;const d=content();if(d.title.length<5||d.message.length<15){$('feedback-result').textContent='اكتب عنواناً من 5 أحرف وتفاصيل من 15 حرفاً على الأقل.';return;}submission||=client.uuid();sending=true;$('feedback-submit').disabled=true;$('feedback-result').textContent='جارٍ إرسال الملاحظة…';try{const result=await client.request('/v1/feedback',{id:submission,...d});if(result.received!==true||result.id!==submission)throw Error('لم يصل تأكيد مطابق للرسالة. أعد المحاولة.');$('feedback-result').textContent='وصلتنا ملاحظتك ✓ رقم المتابعة: '+result.id;$('feedback-result').dataset.state='received';}catch(error){$('feedback-result').textContent=error.message;$('feedback-result').dataset.state='error';}finally{sending=false;$('feedback-submit').disabled=!client?.configured;}};
})();
