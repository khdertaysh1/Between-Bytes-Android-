'use strict';
(()=>{
 const $=id=>document.getElementById(id),allowed=new Set(['bug','idea','lab','content']);
 const selected=new URLSearchParams(location.search).get('case')||'';
 $('feedback-case').value=selected.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
 $('feedback-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('feedback-preview').textContent);$('feedback-copy').textContent='تم النسخ ✓';}catch{$('feedback-copy').textContent='حدد النص في المعاينة وانسخه يدوياً';}};
 $('feedback-form').onsubmit=event=>{event.preventDefault();if(!$('feedback-form').reportValidity())return;
  const kind=allowed.has($('feedback-kind').value)?$('feedback-kind').value:'idea';
  const title=$('feedback-title').value.trim().slice(0,120),message=$('feedback-message').value.trim().slice(0,3000),caseId=$('feedback-case').value.trim().slice(0,80);
  if(title.length<5||message.length<15)return;
  const body='Type: '+kind+'\nCase: '+(caseId||'General')+'\nWeb experience: 0.7\n\n'+message;
  const url=new URL('https://github.com/khdertaysh1/Between-Bytes-Android-/issues/new');url.searchParams.set('title','[Web '+kind+'] '+title);url.searchParams.set('body',body);
  $('feedback-preview').textContent=title+'\n\n'+body;if(url.href.length>7000){url.searchParams.delete('body');$('feedback-handoff-note').textContent='الملاحظة طويلة: انسخ التفاصيل والصقها في GitHub، ثم اضغط Submit new issue. لم تُرسل الملاحظة بعد.';}else $('feedback-handoff-note').textContent='لم تُرسل الملاحظة بعد. في GitHub اضغط Submit new issue لإرسالها.';$('feedback-send').href=url.href;$('feedback-result').hidden=false;$('feedback-result').scrollIntoView({behavior:'smooth',block:'nearest'});
 };
})();
