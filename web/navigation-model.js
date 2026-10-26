export const ORIGIN='https://app.lab';
export const CASES=[
 {id:'code-redirect',title:'01 · وجهة بلا تحقق',detail:'بوابة الدخول تثق بقيمة next بالكامل.',attack:'https://outside.example/landing',check:'true'},
 {id:'redirect-relative',title:'02 · مسار يبدأ بشرطة',detail:'هل كل قيمة تبدأ بـ / تبقى ضمن نفس الموقع؟',attack:'//outside.example/landing',check:"raw.startsWith('/')"},
 {id:'redirect-backslash',title:'03 · اختلاف تفسير الفواصل',detail:'قارن فحص النص مع تفسير URL في المتصفح.',attack:'/\\outside.example/landing',check:"raw.startsWith('/') && !raw.startsWith('//')"},
 {id:'redirect-encoded',title:'04 · ترتيب فك الترميز',detail:'التحقق يحدث قبل فك ترميز إضافي في التطبيق.',attack:'%2F%2Foutside.example/landing',check:"!raw.includes(':') && !raw.startsWith('//')"},
 {id:'redirect-suffix',title:'05 · اسم مضيف مضلل',detail:'قارن بادئة النص مع خاصية origin بعد التحليل.',attack:'https://app.lab.outside.example/landing',check:"raw.startsWith('/') || raw.startsWith('https://app.lab')"},
 {id:'redirect-nested',title:'06 · تحويل متسلسل',detail:'قرار الخطوة الأولى لا يكفي إذا كانت الوجهة تحوّل مجدداً.',attack:'/continue?next=https%3A%2F%2Foutside.example%2Flanding',check:"raw.startsWith('/') && !raw.startsWith('//')"}
];
export function starter(item,fixed=false){
 const preparation=item.id==='redirect-encoded'?"decodeURIComponent(raw)":"raw";
 return `// JavaScript فعلي: request يحتوي الطلب؛ trace يسجل القيم التي تمررها.
const base = 'https://app.lab';
const incoming = new URL(request.url, base);
const raw = incoming.searchParams.get('next') ?? '/account';
trace('input', { raw });
${fixed?`// حل المرجع: حلّل الوجهة ثم افحص الأصل والمسارات النهائية المسموحة.
let value = ${preparation};
${item.id==='redirect-encoded'?"trace('decoded', { raw, value });\n":''}let target = new URL(value, base);
trace('parsed', { href: target.href, origin: target.origin });
const allowed = target.origin === base &&
  !target.username && !target.password &&
  ['/account', '/welcome'].includes(target.pathname);
trace('validation', { allowed });
if (!allowed) return { status: 403, body: 'Destination rejected' };
return { status: 302, location: target.href };`:`const allowed = ${item.check};
trace('validation', { allowed });
if (!allowed) return { status: 403, body: 'Destination rejected' };
let value = ${preparation};
${item.id==='redirect-encoded'?"trace('decoded', { raw, value });\n":''}let target = new URL(value, base);
trace('parsed', { href: target.href, origin: target.origin });
${item.id==='redirect-nested'?`if (target.pathname === '/continue') {
  value = target.searchParams.get('next') ?? '/account';
  target = new URL(value, base);
  trace('nested', { value, href: target.href });
}
`:''}return { status: 302, location: target.href };`}`;
}
export function wire(next){return 'GET /login?'+new URLSearchParams({next})+' HTTP/1.1\nHost: app.lab\nAccept: text/html\n';}
export function parseRequest(raw){
 if(typeof raw!=='string'||raw.length>16000)throw Error('الطلب أكبر من الحد المسموح.');
 const lines=raw.replaceAll('\r','').split('\n');
 const match=/^GET (\/\S*) HTTP\/1\.[01]$/.exec(lines[0]);
 if(!match)throw Error('اكتب GET /login?next=… HTTP/1.1؛ هذا المختبر يدعم GET فقط.');
 const host=lines.filter(x=>/^host:/i.test(x));
 if(host.length!==1||host[0].split(':').slice(1).join(':').trim()!=='app.lab')throw Error('Host يجب أن يكون app.lab مرة واحدة.');
 const url=new URL(match[1],ORIGIN);
 if(url.origin!==ORIGIN||url.pathname!=='/login')throw Error('الطلب يجب أن يستهدف /login على app.lab.');
 return {url:url.href,method:'GET'};
}
export function classify(response){
 if(!response||!Number.isInteger(response.status)||response.status<200||response.status>599)throw Error('الكود يجب أن يرجع كائن استجابة مع status صالح.');
 if(response.status!==302)return {status:response.status,location:null,external:false,body:String(response.body??'').slice(0,4000)};
 if(typeof response.location!=='string'||response.location.length>4000||/[\r\n]/.test(response.location))throw Error('استجابة 302 تحتاج location صالحاً.');
 const target=new URL(response.location,ORIGIN);
 if(!['https:','http:'].includes(target.protocol))throw Error('عارض المختبر يدعم وجهات HTTP وHTTPS فقط.');
 return {status:302,location:target.href,external:target.origin!==ORIGIN,body:''};
}
export function testVectors(item){return [
 {label:'حساب الطالب',next:'/account',allow:true},
 {label:'صفحة الترحيب',next:'/welcome',allow:true},
 {label:'مسار مع معاملات',next:'/account?tab=lessons',allow:true},
 {label:'عنوان كامل من نفس الأصل',next:ORIGIN+'/welcome',allow:true},
 {label:'تجاوز الحالة الحالية',next:item.attack,allow:false},
 {label:'مضيف خارجي آخر',next:'https://other.example/collect',allow:false},
 {label:'network-path',next:'//other.example/collect',allow:false},
 {label:'اسم مستخدم داخل URL',next:'https://app.lab@other.example/collect',allow:false},
 {label:'اختلاف المنفذ',next:'https://app.lab:444/account',allow:false},
 {label:'اختلاف البروتوكول',next:'http://app.lab/account',allow:false},
 {label:'تحويل داخلي متسلسل',next:'/continue?next=https%3A%2F%2Fother.example',allow:false},
 {label:'مسار غير مسموح',next:'/admin',allow:false}
 ];}
