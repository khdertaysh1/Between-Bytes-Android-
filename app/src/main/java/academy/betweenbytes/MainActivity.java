package academy.betweenbytes;

import android.app.*;
import android.os.Bundle;
import android.content.*;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.*;
import android.widget.*;
import android.text.InputType;
import android.security.keystore.*;
import android.util.Base64;
import org.json.*;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import javax.net.ssl.HttpsURLConnection;
import java.net.*;
import java.io.*;
import java.security.KeyStore;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import java.util.concurrent.*;

/** Native Android views. No WebView, no external tracking or execution of lab payloads. */
public class MainActivity extends Activity {
    final int BG=Color.rgb(11,16,23),PANEL=Color.rgb(17,25,35),LINE=Color.rgb(36,48,60),TEXT=Color.rgb(237,242,244),MUTED=Color.rgb(140,154,169),LIME=Color.rgb(183,243,107),CYAN=Color.rgb(116,217,209);
    LinearLayout root,body,nav; ScrollView scroll; SharedPreferences prefs; JSONArray labs; JSONObject state,profile; String page="home",token=""; ExecutorService worker=Executors.newSingleThreadExecutor();
    int labIndex=0,caseIndex=0; int[] answers; boolean busy=false; String base="";
    interface Done {void accept(JSONObject data);}
    @Override public void onCreate(Bundle b){super.onCreate(b);prefs=getSharedPreferences("academy",MODE_PRIVATE);base=prefs.getString("api","");
        try{String raw=new String(readBytes(getAssets().open("catalog.json"),2000000),java.nio.charset.StandardCharsets.UTF_8);labs=new JSONObject(prefs.getString("catalog",raw)).getJSONArray("labs");state=new JSONObject(prefs.getString("state","{\"completed\":{},\"days\":[],\"pending\":[],\"read\":{}}"));token=readToken();if(b!=null){page=b.getString("page","home");labIndex=b.getInt("lab",0);caseIndex=b.getInt("case",0);answers=b.getIntArray("answers");}show();}catch(Exception e){TextView error=new TextView(this);error.setText("تعذر تحميل المحتوى. أعد تثبيت التطبيق.");setContentView(error);}
    }
    @Override public void onSaveInstanceState(Bundle b){super.onSaveInstanceState(b);b.putString("page",page);b.putInt("lab",labIndex);b.putInt("case",caseIndex);b.putIntArray("answers",answers);}
    byte[] readBytes(InputStream in,int limit)throws IOException{try(InputStream input=in;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] block=new byte[8192];int n,total=0;while((n=input.read(block))!=-1){total+=n;if(total>limit)throw new IOException("Response too large");out.write(block,0,n);}return out.toByteArray();}}
    int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
    GradientDrawable bg(int color,int stroke){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(14));if(stroke!=0)d.setStroke(dp(1),stroke);return d;}
    LinearLayout column(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);return l;}
    LinearLayout card(){LinearLayout l=column();l.setPadding(dp(20),dp(18),dp(20),dp(18));l.setBackground(bg(PANEL,LINE));LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.bottomMargin=dp(14);l.setLayoutParams(p);body.addView(l);return l;}
    TextView text(String s,int size,int color){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(color);t.setLineSpacing(dp(5),1);t.setPadding(0,dp(4),0,dp(4));return t;}
    void add(LinearLayout l,String s,int size,int color){l.addView(text(s,size,color));}
    void heading(String title,String desc){add(body,"BETWEEN BYTES / ACADEMY",10,LIME);TextView t=text(title,28,TEXT);t.setTypeface(null,Typeface.BOLD);body.addView(t);add(body,desc,12,MUTED);Space sp=new Space(this);body.addView(sp,new LinearLayout.LayoutParams(1,dp(18)));}
    Button button(LinearLayout l,String s,boolean primary,Runnable r){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextSize(13);b.setTextColor(primary?BG:TEXT);b.setBackground(bg(primary?LIME:PANEL,primary?LIME:LINE));LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,dp(52));p.topMargin=dp(12);l.addView(b,p);b.setOnClickListener(v->r.run());return b;}
    JSONObject done(){return state.optJSONObject("completed");} int xp(){return done().length()*150;}
    JSONArray days(){return state.optJSONArray("days");}
    boolean hasDay(String day){for(int i=0;i<days().length();i++)if(day.equals(days().optString(i)))return true;return false;}
    String today(){return LocalDate.now(ZoneOffset.UTC).toString();}
    int streak(){LocalDate d=LocalDate.now(ZoneOffset.UTC);if(!hasDay(d.toString()))d=d.minusDays(1);int n=0;while(hasDay(d.toString())){n++;d=d.minusDays(1);}return n;}
    boolean unlocked(int i){return i==0||done().has(labs.optJSONObject(i-1).optString("id"));}
    void persist(){prefs.edit().putString("state",state.toString()).apply();}
    void toast(String s){Toast.makeText(this,s,Toast.LENGTH_LONG).show();}
    void go(String next){page=next;show();}
    void show(){root=column();root.setBackgroundColor(BG);root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);root.setPadding(0,0,0,0);root.setOnApplyWindowInsetsListener((v,in)->{v.setPadding(0,in.getSystemWindowInsetTop(),0,in.getSystemWindowInsetBottom());return in;});setContentView(root);
        LinearLayout header=new LinearLayout(this);header.setGravity(Gravity.CENTER_VERTICAL);header.setPadding(dp(20),dp(10),dp(20),dp(10));TextView brand=text("◈  BETWEEN BYTES",14,LIME);brand.setTypeface(null,Typeface.BOLD);header.addView(brand,new LinearLayout.LayoutParams(0,dp(42),1));TextView mode=text(token.isEmpty()?"محفوظ محلياً":"حساب متصل",10,MUTED);header.addView(mode);root.addView(header);
        scroll=new ScrollView(this);scroll.setFillViewport(true);body=column();body.setPadding(dp(20),dp(22),dp(20),dp(24));scroll.addView(body);root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
        switch(page){case "path": path();break;case "profile":account();break;case "case":lesson();break;case "quiz":quiz();break;default:home();}
        nav=new LinearLayout(this);nav.setBackgroundColor(PANEL);nav.setPadding(dp(12),dp(7),dp(12),dp(7));String[] names={"⌂  الرئيسية","⌘  المسار","◎  حسابي"},routes={"home","path","profile"};for(int i=0;i<3;i++){final String route=routes[i];TextView n=text(names[i],12,page.equals(route)?LIME:MUTED);n.setGravity(Gravity.CENTER);n.setPadding(dp(4),dp(12),dp(4),dp(12));nav.addView(n,new LinearLayout.LayoutParams(0,-2,1));n.setOnClickListener(v->go(route));}root.addView(nav);
    }
    void home(){heading("خطوتك الجاية تبدأ من هون.","تعلّم، حلّل، وابنِ مهارتك. حالة واحدة كل مرة.");LinearLayout stats=card();add(stats,"ϟ  "+xp()+" XP     ♨  "+streak()+" أيام",23,LIME);add(stats,"المستوى "+(xp()/300+1)+"  ·  "+done().length()+" / 14 وحدات مكتملة",12,MUTED);
        int next=0;for(int i=0;i<labs.length();i++)if(unlocked(i)&&!done().has(labs.optJSONObject(i).optString("id"))){next=i;break;}final int idx=next;JSONObject l=labs.optJSONObject(idx);LinearLayout hero=card();hero.setBackground(bg(Color.rgb(21,37,28),Color.rgb(49,75,54)));add(hero,"●  مسارك التالي",11,LIME);add(hero,l.optString("title"),24,TEXT);add(hero,l.optString("summary"),13,MUTED);add(hero,l.optJSONArray("cases").length()+" حالات  ·  "+l.optInt("minutes")+" دقيقة  ·  +150 XP",11,CYAN);button(hero,"ابدأ التعلّم ←",true,()->open(idx));
        add(body,"مسار تعلّمك",19,TEXT);for(int i=0;i<Math.min(4,labs.length());i++)module(i);LinearLayout tip=card();add(tip,"عقلية الباحث",15,LIME);add(tip,"رمز 200 وحده لا يثبت ثغرة. راقب الحالة والأثر، وافهم سبب التغيير.",13,MUTED);add(tip,"المحتوى تحليل موجّه. المختبرات التنفيذية في مشروع Web Labs المستقل.",11,MUTED);
    }
    void path(){heading("مهارتك، خطوة بخطوة.","13 مختبراً · 96 حالة تحليلية · 6 دروس تأسيسية");for(int i=0;i<labs.length();i++)module(i);}
    void module(int i){JSONObject l=labs.optJSONObject(i);String id=l.optString("id");LinearLayout c=card();add(c,"MODULE "+String.format(Locale.ROOT,"%02d",i+1)+" / "+l.optString("en"),9,CYAN);add(c,l.optString("icon")+"  "+l.optString("title"),18,TEXT);add(c,l.optJSONArray("cases").length()+" حالات  ·  "+l.optInt("minutes")+" دقيقة",11,MUTED);button(c,done().has(id)?"✓ مكتمل "+done().optInt(id)+"%":unlocked(i)?"ابدأ ←":"مقفل · أكمل المستوى السابق",unlocked(i),()->open(i));}
    void open(int i){if(!unlocked(i)){toast("أكمل اختبار المستوى السابق أولاً.");return;}labIndex=i;caseIndex=state.optJSONObject("read").optInt(labs.optJSONObject(i).optString("id"),0);go("case");}
    void lesson(){JSONObject l=labs.optJSONObject(labIndex);JSONArray cases=l.optJSONArray("cases");caseIndex=Math.max(0,Math.min(caseIndex,cases.length()-1));JSONObject c=cases.optJSONObject(caseIndex);heading(c.optString("title"),"حالة "+(caseIndex+1)+" / "+cases.length()+"  ·  "+l.optString("title"));
        try{state.optJSONObject("read").put(l.optString("id"),caseIndex);persist();}catch(Exception ignored){}
        LinearLayout story=card();add(story,c.optString("story"),15,TEXT);add(story,"أين المشكلة؟",16,CYAN);add(story,c.optString("cause"),14,MUTED);
        if(c.optJSONObject("normal").length()>0){LinearLayout req=card();add(req,"طلب طبيعي → قيمة معدّلة",15,CYAN);code(req,c.optJSONObject("normal").toString()+"\n→\n"+c.optJSONObject("attack").toString());}
        if(!c.optString("bad_code").isEmpty()){LinearLayout codes=card();add(codes,"منطق غير آمن",15,CYAN);code(codes,c.optString("bad_code"));add(codes,"منطق الإصلاح",15,LIME);code(codes,c.optString("fixed_code"));}
        LinearLayout fix=card();add(fix,"كيف تحلّل النتيجة؟",16,CYAN);add(fix,c.optString("interpretation"),14,MUTED);add(fix,"سد الثغرة",16,LIME);add(fix,c.optString("fix"),14,TEXT);
        button(body,caseIndex==cases.length()-1?"ابدأ اختبار الوحدة ←":"الحالة التالية ←",true,()->{if(caseIndex==cases.length()-1){answers=new int[l.optJSONArray("quiz").length()];Arrays.fill(answers,-1);go("quiz");}else{caseIndex++;show();}});
        if(caseIndex>0)button(body,"→ الحالة السابقة",false,()->{caseIndex--;show();});
    }
    void code(LinearLayout l,String code){TextView t=text(code.replace("\\n","\n"),12,CYAN);t.setTypeface(Typeface.MONOSPACE);t.setTextDirection(View.TEXT_DIRECTION_LTR);t.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);t.setPadding(dp(12),dp(12),dp(12),dp(12));t.setBackground(bg(BG,LINE));t.setTextIsSelectable(true);l.addView(t,new LinearLayout.LayoutParams(-1,-2));}
    void quiz(){JSONObject l=labs.optJSONObject(labIndex);JSONArray qs=l.optJSONArray("quiz");if(answers==null||answers.length!=qs.length()){answers=new int[qs.length()];Arrays.fill(answers,-1);}heading("اختبار "+l.optString("title"),"اختر المعالجة الأنسب لكل حالة. النجاح: 80%.");
        for(int i=0;i<qs.length();i++){final int index=i;JSONObject q=qs.optJSONObject(i);LinearLayout c=card();add(c,(i+1)+". "+q.optString("prompt"),15,TEXT);RadioGroup group=new RadioGroup(this);JSONArray opts=q.optJSONArray("options");for(int j=0;j<opts.length();j++){RadioButton b=new RadioButton(this);b.setId(View.generateViewId());b.setTag(j);b.setText(opts.optString(j));b.setTextColor(TEXT);b.setTextSize(13);b.setPadding(0,dp(8),0,dp(8));group.addView(b);if(answers[i]==j)b.setChecked(true);}group.setOnCheckedChangeListener((g,checked)->{RadioButton selected=g.findViewById(checked);if(selected!=null)answers[index]=(Integer)selected.getTag();});c.addView(group);}
        button(body,busy?"جارٍ التحقق…":"تسليم الاختبار ←",true,this::submit);
    }
    void submit(){if(busy)return;for(int a:answers)if(a<0){toast("جاوب على كل الأسئلة أولاً.");return;}JSONObject l=labs.optJSONObject(labIndex);JSONArray qs=l.optJSONArray("quiz"),array=new JSONArray();int correct=0;for(int i=0;i<answers.length;i++){array.put(answers[i]);if(answers[i]==qs.optJSONObject(i).optInt("answer"))correct++;}int score=100*correct/answers.length;JSONObject event=new JSONObject();try{event.put("event",UUID.randomUUID().toString());event.put("lab",l.optString("id"));event.put("answers",array);}catch(Exception ignored){}
        if(token.isEmpty()){complete(score);return;}
        busy=true;request("attempt",event,r->{busy=false;try{applyProfile(r.getJSONObject("profile"));complete(r.optInt("score"),false);}catch(Exception e){toast("تعذر قراءة التقدم.");}},err->{busy=false;if(err instanceof IOException){state.optJSONArray("pending").put(event);persist();complete(score);toast("المحاولة محلية بانتظار مراجعة الخادم عند المزامنة.");}else toast(err.getMessage());});
    }
    void complete(int score){ complete(score,true); }
    void complete(int score,boolean local){boolean passed=score>=80;JSONObject l=labs.optJSONObject(labIndex);if(passed&&local){try{done().put(l.optString("id"),Math.max(score,done().optInt(l.optString("id"))));if(!hasDay(today()))days().put(today());persist();}catch(Exception ignored){}}
        new AlertDialog.Builder(this).setTitle(score+"% — "+(passed?"ممتاز، كمل مسارك!":"راجع الحالات وجرّب ثانية")).setMessage(passed?"تم حفظ التقدم. نقاط الإنجاز تُمنح مرة واحدة.":"النجاح يحتاج 80%. كل محاولة بتزيد فهمك.").setPositiveButton("العودة للمسار",(d,w)->go("path")).setNegativeButton("مراجعة الحالات",(d,w)->{caseIndex=0;go("case");}).setCancelable(false).show();
    }
    EditText field(LinearLayout l,String hint,int type){EditText e=new EditText(this);e.setHint(hint);e.setHintTextColor(MUTED);e.setTextColor(TEXT);e.setTextSize(14);e.setInputType(type);e.setSingleLine(true);e.setPadding(dp(12),dp(12),dp(12),dp(12));e.setBackground(bg(BG,LINE));LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.topMargin=dp(12);l.addView(e,p);return e;}
    void account(){heading("رحلتك، على كل أجهزتك.","حساب واحد ومحتوى مشترك للويب والأندرويد.");LinearLayout stats=card();add(stats,xp()+" XP  ·  سلسلة "+streak()+" أيام",21,LIME);add(stats,done().length()+" وحدات مكتملة",13,MUTED);
        LinearLayout setup=card();add(setup,"خدمة الأكاديمية",17,TEXT);add(setup,"المحتوى متاح محلياً. للمزامنة استخدم عنوان HTTPS لخادم الأكاديمية نفسه الذي يشغّل PWA. المعاينة الخاصة ليست API عاماً.",12,MUTED);EditText endpoint=field(setup,"https://academy.example",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_URI);endpoint.setText(base);endpoint.setTextDirection(View.TEXT_DIRECTION_LTR);button(setup,"حفظ عنوان الخدمة",false,()->{String value=endpoint.getText().toString().trim().replaceAll("/+$","");try{URI u=new URI(value);if(!"https".equals(u.getScheme())||u.getHost()==null||u.getUserInfo()!=null||(u.getPath()!=null&&!u.getPath().isEmpty())||u.getQuery()!=null||u.getFragment()!=null)throw new Exception();if(!value.equals(base)){if(!token.isEmpty()){toast("سجّل الخروج قبل تغيير الخدمة.");return;}state=new JSONObject("{\"completed\":{},\"days\":[],\"pending\":[],\"read\":{}}");persist();}base=value;prefs.edit().putString("api",base).apply();toast("تم حفظ الخدمة.");show();}catch(Exception e){toast("أدخل أصل HTTPS صحيحاً بدون مسار.");}});
        LinearLayout auth=card();if(!token.isEmpty()){add(auth,"الحساب متصل",18,LIME);add(auth,state.optString("email",""),13,MUTED);button(auth,busy?"جارٍ المزامنة…":"مزامنة التقدم والمحتوى",true,this::sync);button(auth,"تسجيل الخروج",false,()->{request("logout",new JSONObject(),r->logout(),e->toast("تعذر إنهاء الجلسة على الخادم. أعد الاتصال للمحاولة."));});}
        else{add(auth,"حساب الأكاديمية",18,TEXT);add(auth,"تحتاج خدمة منشورة للإنشاء والدخول. لا يُرفع تقدّم الضيف تلقائياً إلى الحساب.",12,MUTED);EditText name=field(auth,"اسمك للحساب الجديد",InputType.TYPE_CLASS_TEXT);EditText email=field(auth,"البريد الإلكتروني",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);EditText password=field(auth,"كلمة مرور (12 محرفاً على الأقل)",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);
            for(String action:new String[]{"login","register"})button(auth,action.equals("login")?"تسجيل الدخول":"إنشاء حساب",action.equals("login"),()->{if(busy)return;if(base.isEmpty()){toast("اربط خدمة الأكاديمية أولاً.");return;}JSONObject data=new JSONObject();try{data.put("name",name.getText().toString());data.put("email",email.getText().toString());data.put("password",password.getText().toString());}catch(Exception ignored){}busy=true;request(action,data,r->{busy=false;try{token=r.getString("token");storeToken(token);state=new JSONObject("{\"completed\":{},\"days\":[],\"pending\":[],\"read\":{}}");applyProfile(r.getJSONObject("profile"));password.setText("");show();}catch(Exception e){token="";toast("تعذر حفظ الجلسة بأمان.");}},e->{busy=false;toast(e.getMessage());});});}
        LinearLayout note=card();add(note,"نسخة أولية · تعلّم ذاتي",14,CYAN);add(note,"الحالات تحليل موجّه وليست تشغيل خادم ضعيف. الحسابات لا تتضمن حالياً تأكيد البريد أو استعادة كلمة المرور. توقيت سلسلة الحساب UTC.",12,MUTED);
    }
    void applyProfile(JSONObject p)throws Exception{state.put("completed",p.getJSONObject("completed"));state.put("days",p.getJSONArray("days"));state.put("email",p.optString("email"));persist();}
    void logout(){token="";prefs.edit().remove("session").apply();try{state=new JSONObject("{\"completed\":{},\"days\":[],\"pending\":[],\"read\":{}}");persist();}catch(Exception ignored){}show();}
    interface Failed{void accept(Exception e);}
    void request(String route,JSONObject data,Done ok,Failed fail){if(base.isEmpty()){fail.accept(new Exception("اربط خدمة الأكاديمية أولاً."));return;}final String origin=base,session=token;worker.execute(()->{HttpsURLConnection con=null;try{con=(HttpsURLConnection)new URL(origin+"/api/"+route).openConnection();con.setConnectTimeout(12000);con.setReadTimeout(12000);con.setInstanceFollowRedirects(false);con.setRequestProperty("Accept","application/json");con.setRequestProperty("X-Academy-Client","android");if(!session.isEmpty())con.setRequestProperty("Authorization","Bearer "+session);if(data!=null){con.setRequestMethod("POST");con.setDoOutput(true);con.setRequestProperty("Content-Type","application/json");try(OutputStream out=con.getOutputStream()){out.write(data.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));}}int code=con.getResponseCode();InputStream input=code<400?con.getInputStream():con.getErrorStream();if(input==null)throw new Exception("تعذر الوصول للخدمة.");byte[] bytes=readBytes(input,2000000);input.close();JSONObject r=new JSONObject(new String(bytes,java.nio.charset.StandardCharsets.UTF_8));if(code<200||code>=300)throw new Exception(r.optString("error","تعذر الاتصال بالخدمة."));runOnUiThread(()->{if(!isFinishing())ok.accept(r);});}catch(Exception e){runOnUiThread(()->{if(!isFinishing())fail.accept(e);});}finally{if(con!=null)con.disconnect();}});}
    void sync(){if(busy)return;busy=true;syncPending();}
    void syncPending(){JSONArray pending=state.optJSONArray("pending");if(pending.length()>0){request("attempt",pending.optJSONObject(0),r->{try{pending.remove(0);applyProfile(r.getJSONObject("profile"));syncPending();}catch(Exception e){busy=false;toast("تعذر المزامنة.");}},e->{busy=false;toast(e.getMessage());});return;}
        request("me",null,r->{try{applyProfile(r);request("catalog",null,c->{try{if(c.optInt("schemaVersion")!=1||c.optJSONArray("labs")==null)throw new Exception();labs=c.getJSONArray("labs");prefs.edit().putString("catalog",c.toString()).apply();busy=false;go("profile");toast("تمت مزامنة المحتوى والتقدم.");}catch(Exception e){busy=false;toast("إصدار محتوى غير مدعوم.");}},e->{busy=false;show();toast("تم تحديث التقدم. تعذر تحديث المحتوى.");});}catch(Exception e){busy=false;toast("تعذر المزامنة.");}},e->{busy=false;toast(e.getMessage());});
    }
    SecretKey key()throws Exception{KeyStore k=KeyStore.getInstance("AndroidKeyStore");k.load(null);if(k.containsAlias("bb_session"))return(SecretKey)k.getKey("bb_session",null);KeyGenerator gen=KeyGenerator.getInstance("AES","AndroidKeyStore");gen.init(new KeyGenParameterSpec.Builder("bb_session",KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());return gen.generateKey();}
    void storeToken(String value)throws Exception{Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());String encrypted=Base64.encodeToString(c.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(c.doFinal(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)),Base64.NO_WRAP);prefs.edit().putString("session",encrypted).apply();}
    String readToken(){try{String s=prefs.getString("session","");if(s.isEmpty())return "";String[] parts=s.split(":");Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));return new String(c.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),java.nio.charset.StandardCharsets.UTF_8);}catch(Exception e){prefs.edit().remove("session").apply();return "";}}
    @Override public void onBackPressed(){if(page.equals("case")||page.equals("quiz"))go("path");else if(!page.equals("home"))go("home");else super.onBackPressed();}
    @Override public void onDestroy(){super.onDestroy();worker.shutdown();}
}
