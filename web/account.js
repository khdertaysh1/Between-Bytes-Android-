'use strict';
window.BBAccount=(()=>{
 const client=window.BBServiceClient,$=id=>document.getElementById(id);let token='',user=null,syncTimer,queue=Promise.resolve();
 try{token=sessionStorage.getItem('bb-learner-token')||'';}catch{}
 async function api(path,data,method=data?'POST':'GET',auth=token){
  if(!client?.configured)throw Error('خدمة الحسابات غير متاحة حالياً. يمكنك متابعة المختبرات كضيف.');
  const response=await window.fetch(client.base+path,{method,credentials:'omit',headers:{...(data?{'Content-Type':'application/json'}:{}),...(auth?{Authorization:'Bearer '+auth}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(15000)});
  let result;try{result=await response.json();}catch{throw Error('تعذّر قراءة استجابة الخدمة.');}
  if(!response.ok){const errors={400:'أدخل إيميلاً صالحاً وكلمة سر من 12 إلى 128 حرفاً.',401:'الإيميل أو كلمة السر غير صحيحين، أو انتهت الجلسة.',409:'الإيميل مستخدم؛ جرّب تسجيل الدخول.',429:'محاولات كثيرة. انتظر قليلاً وحاول مجدداً.',503:'الخدمة غير جاهزة حالياً. تقدّمك المحلي محفوظ.'};const error=Error(errors[response.status]||'تعذّر إكمال الطلب.');error.status=response.status;throw error;}return result;
 }
 const status=message=>{$('account-status').textContent=message;};
 function paint(){const signed=!!user;$('account-session').hidden=!signed;$('account-form').hidden=signed;$('account-email').textContent=user?.email||'';$('account-open').textContent=signed?'حسابي · حفظ التقدّم':'تسجيل الدخول · اختياري';$('account-import').hidden=!signed;}
 function switchProgress(){window.BBAcademyProgress?.switchUser(user?.id||'');paint();}
 async function pull(){const id=user?.id,session=token;await queue.catch(()=>{});const data=await api('/v1/progress',undefined,'GET',session);if(user?.id!==id||token!==session)return;window.BBAcademyProgress?.merge(data.completed);await sync();}
 async function sync(){if(!user)return;const session=token,completed=window.BBAcademyProgress?.completed()||[];queue=queue.catch(()=>{}).then(()=>api('/v1/progress',{completed},'POST',session));await queue;if(token===session)status('تمت مزامنة علامات الإنجاز. الملاحظات ومسودات الطلبات تبقى على جهازك.');}
 function changed(){clearTimeout(syncTimer);if(user)syncTimer=setTimeout(()=>sync().catch(e=>status(e.message)),700);}
 async function start(){
  const dialog=$('account-dialog');$('account-open').onclick=()=>dialog.showModal();$('account-close').onclick=()=>dialog.close();
  $('account-form').onsubmit=async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;status('جارٍ الاتصال…');try{const data=await api('/v1/auth/'+button.value,{email:$('signin-email').value,password:$('signin-password').value});token=data.token;user=data.user;try{sessionStorage.setItem('bb-learner-token',token);}catch{}$('signin-password').value='';switchProgress();await pull();}catch(e){status(e.message);}finally{button.disabled=false;}};
  $('account-sync').onclick=()=>pull().catch(e=>status(e.message));
  $('account-import').onclick=()=>{window.BBAcademyProgress?.importGuest();sync().catch(e=>status(e.message));};
  $('account-logout').onclick=async()=>{try{await api('/v1/auth/logout',{});clearTimeout(syncTimer);token='';user=null;try{sessionStorage.removeItem('bb-learner-token');}catch{}switchProgress();status('تم تسجيل الخروج. يمكنك متابعة التعلّم كضيف.');}catch(e){status('تعذّر إنهاء جلسة السيرفر؛ أعد المحاولة. '+e.message);}};
  paint();if(token)try{user=(await api('/v1/auth/me')).user;switchProgress();await pull();}catch(e){status(e.message);if(e.status===401){token='';try{sessionStorage.removeItem('bb-learner-token');}catch{}}}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 return {api,changed,async remove(caseId){clearTimeout(syncTimer);if(user){const session=token;queue=queue.catch(()=>{}).then(()=>api('/v1/progress',{completed:[],removed:[caseId]},'POST',session));await queue;}}};
})();
