"""Deterministic additional hands-on lessons shared by web and Android."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'web/engine'))
from advanced_labs import token,RULES
bi=lambda ar,en:{'ar':ar,'en':en}
rows=[]
def add(id,group,title,normal,attack,cause,fix,interpretation,bad,good):
 rows.append(dict(id=id,group=group,title=title,normal=normal,attack=attack,level='advanced',cause=cause,fix=fix,lesson=dict(
  story=bi('أنت تختبر خدمة Northstar محلية. '+cause['ar'],'You are testing a local Northstar service. '+cause['en']),
  interpretation=interpretation,bad_code=bad,fixed_code=good,steps=[
   bi('شغّل الطلب السليم في المُصلحة وسجّل البيانات المسموح بها.','Run the fixed control and inspect the permitted data.'),
   bi('عدّل الحقل المشار إليه، وشغّل الطلب في الضعيفة. افحص الأثر الفعلي.','Change the described field and run the vulnerable request. Inspect the actual effect.'),
   bi('أعد نفس المدخل في المُصلحة. قارن الاستجابة والحالة قبل الطلب وبعده.','Replay identical input against the fix. Compare response and state before and after.')])) )
for suffix,title,claims,alg,rule in [
 ('none',bi('قبول خوارزمية none','Unsigned algorithm'),{},'none','algorithm'),
 ('signature',bi('قراءة رمز بلا تحقق توقيع','Skipped signature verification'),{},'HS256','signature'),
 ('expiry',bi('رمز منتهي الصلاحية','Expired token'),{'exp':1999999999},'HS256','expiry'),
 ('audience',bi('رمز مخصص لخدمة أخرى','Wrong audience'),{'aud':'billing'},'HS256','audience'),
 ('issuer',bi('جهة إصدار غير موثوقة','Untrusted issuer'),{'iss':'untrusted'},'HS256','issuer'),
 ('purpose',bi('رمز استعادة بدل رمز وصول','Reset token used as access'),{'purpose':'password-reset'},'HS256','purpose')]:
 attack=token(claims,alg)
 if suffix=='signature':attack=attack.rsplit('.',1)[0]+'.invalid-signature'
 add('jwt-'+suffix,'jwt',title,{'token':token()},{'token':attack},
  bi('الخدمة تتجاوز قاعدة '+rule+' عند قراءة JWT.','The service skips the '+rule+' rule when reading a JWT.'),
  bi('تحقق من التوقيع والخوارزمية والوقت والجهة والجمهور والغرض على الخادم. المفتاح هنا معلن للتدريب فقط.','Enforce signature, algorithm, expiry, issuer, audience and purpose. This key is public and for training only.'),
  bi('افحص checks_trace: هل ظهرت قاعدة مرفوضة مع authorized=true؟ المُصلحة تعيد 401 وتحجب private_profile. الرمز السليم يبقى مقبولاً. التوقيع HMAC فعلي والوقت ثابت للتجربة.','Inspect checks_trace: does a failed rule coexist with authorized=true? The fix returns 401 and withholds private_profile. A valid control remains accepted. HMAC is real; the exercise clock is fixed.'),
  'claims = decode_without_enforcing_'+rule+'(token)','claims = verify_all_required_rules(token, trusted_key, server_clock)')
titles=[('الدور الإداري','Administrator role'),('تأكيد البريد','Email verification'),('الرصيد المالي','Account credit'),('المؤسسة','Tenant membership'),('مالك الحساب','Account owner'),('صلاحية متداخلة','Nested permission')]
for (id,(field,initial,attack)),title in zip(RULES.items(),titles):
 add(id,'assignment',bi(*title),{'patch':{'display_name':'Alice Learner'}},{'patch':{'display_name':'Alice Learner',field:attack}},
  bi('تحديث الملف يقبل الحقل الحساس '+field+' من العميل.','The profile update accepts the protected '+field+' field from the client.'),
  bi('اسمح بحقول العرض صراحة وارفض تعديل الحقول المحمية، بما فيها الحقول المتداخلة.','Explicitly allow display fields and reject protected changes, including nested fields.'),
  bi('أضف '+field+' داخل patch ثم قارن before وafter. الضعيفة تحفظ القيمة الحساسة؛ المُصلحة تعيد 403 دون تغيير السجل. إرسال display_name وحده ينجح.','Add '+field+' inside patch and compare before and after. The vulnerable service persists the protected value; the fix returns 403 without mutation. display_name alone still succeeds.'),
  'profile.update(body["patch"])','require_allowed_patch(body["patch"], allowed={"display_name"})')
(ROOT/'web/engine/advanced_catalog.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print('Built',len(rows),'advanced cases')
