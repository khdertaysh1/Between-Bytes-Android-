"""One canonical catalog -> PWA + native bundled/offline content."""
import json, pathlib, random
ROOT=pathlib.Path(__file__).resolve().parents[1]
NAMES={'payment':('منطق الدفع','Payment logic','◈'),'access':('التحكم بالوصول','Access control','⌘'),'rate':('حدود الاستخدام','Rate limiting','◷'),'xss':('أمن المتصفح وXSS','Browser security','◇'),'code':('حقن الأوامر والاستعلامات','Injection','⌁'),'ssrf':('طلبات الخادم SSRF','Server-side requests','◎'),'redirect':('إعادة التوجيه','Redirects','↗'),'csrf':('تزوير الطلبات CSRF','Request forgery','⤴'),'cors':('سياسة CORS','Cross-origin access','⊕'),'upload':('رفع الملفات','File uploads','↑'),'traversal':('اجتياز المسارات','Path traversal','⌇'),'disclosure':('كشف المعلومات','Information disclosure','▤'),'authentication':('المصادقة والجلسات','Authentication','▣')}
ORDER=['access','xss','authentication','payment','rate','csrf','cors','ssrf','redirect','upload','traversal','disclosure','code']
def make():
    rows=json.loads((ROOT/'shared/source-cases.json').read_text())
    labs=[]
    intro=[('http','الطلب والاستجابة','المتصفح يرسل طلب HTTP والخادم يقرر الصلاحيات ويعيد الاستجابة. رمز 200 وحده لا يثبت وقوع أثر أمني.','تحقق من الحالة المخزنة والأثر الفعلي، وليس رمز الاستجابة وحده.'),('scope','النطاق والتصريح','قبل الاختبار حدّد الأصول والحسابات المسموح بها وحدود البرنامج.','اختبر حساباتك وبياناتك فقط ضمن تصريح واضح.'),('trust','حدود الثقة','كل قيمة من المتصفح قابلة للتعديل، حتى الحقول المخفية.','اجعل الخادم مصدر الحقيقة للأسعار والصلاحيات.'),('evidence','إثبات الأثر','قارن طلباً طبيعياً بطلب معدل مع تغيير عامل واحد، وسجّل حالة ما قبل وما بعد.','أثبت التغيير ببيانات اختبار تملكها، ثم أعد الحالة الأصلية.'),('fix','فهم الإصلاح','حجب زر في الواجهة لا يحمي API. الإصلاح يفرض القاعدة على الخادم.','أعد الطلب المخالف على النسخة المُصلحة وتأكد من رفضه دون تغيير الحالة.'),('report','كتابة التقرير','التقرير الجيد يشرح السبب وخطوات إعادة الإنتاج والأثر والإصلاح المقترح.','ميّز بين ملاحظة محتملة وأثر قابل لإعادة الإنتاج.')]
    cases=[{'id':'intro-'+i,'title':t,'story':s,'cause':s,'fix':f,'interpretation':'هذه أساسيات التحليل التي ستستخدمها في كل الحالات التالية.','normal':{},'attack':{},'bad_code':'# افتراضات غير موثوقة','fixed_code':'# تحقق من القاعدة والأثر على الخادم'} for i,t,s,f in intro]
    def add(g,title,en,icon,cases):
        questions=[]
        for c in cases:
            others=[x['fix'] for x in cases if x['id']!=c['id'] and x['fix']!=c['fix']]
            wrong=list(dict.fromkeys(others))[:2]
            wrong+=(['إخفاء الزر في الواجهة دون تعديل تحقق الخادم.','الاعتماد على رمز 200 وحده لإثبات الأثر.'][:max(0,2-len(wrong))])
            opts=[c['fix']]+wrong
            random.Random(c['id']).shuffle(opts)
            questions.append({'id':c['id']+'-fix','caseId':c['id'],'prompt':'ما المعالجة الأنسب لحالة «'+c['title']+'»؟','options':opts,'answer':opts.index(c['fix']),'explanation':c['fix']})
        labs.append({'id':g,'title':title,'en':en,'icon':icon,'minutes':len(cases)*3,'xp':150,'summary':cases[0]['cause'],'cases':cases,'quiz':questions})
    add('foundations','ابدأ من الصفر','Security foundations','◈',cases)
    for g in ORDER:
        cases=[]
        for r in rows:
            if r['group']!=g:continue
            lesson=r.get('lesson',{})
            ar=lambda x:x.get('ar','') if isinstance(x,dict) else str(x)
            cases.append({'id':r['id'],'title':ar(r['title']),'story':ar(lesson.get('story',r['cause'])),'cause':ar(r['cause']),'fix':ar(r['fix']),'interpretation':ar(lesson.get('interpretation',r['fix'])),'normal':r['normal'],'attack':r['attack'],'bad_code':lesson.get('bad_code',''),'fixed_code':lesson.get('fixed_code','')})
        add(g,*NAMES[g],cases)
    out={'schemaVersion':1,'version':'0.1.0','title':'Between Bytes Academy','assessment':'guided-self-study','labs':labs}
    p=ROOT/'shared/catalog.json';p.write_text(json.dumps(out,ensure_ascii=False,indent=2))
    for dest in [ROOT/'web/catalog.json',ROOT/'app/src/main/assets/catalog.json']:
        dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(p.read_bytes())
    print(f'{len(labs)} modules; {sum(len(x["cases"]) for x in labs)} guided cases; shared assets identical')
if __name__=='__main__':make()
