package academy.betweenbytes;
import android.app.Instrumentation;
import android.content.Intent;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.*;

@RunWith(AndroidJUnit4.class)
public class PracticeSmokeTest {
    private final Instrumentation instrumentation=InstrumentationRegistry.getInstrumentation();
    private PracticeActivity activity;
    private String js(String code)throws Exception{
        CountDownLatch latch=new CountDownLatch(1);AtomicReference<String> answer=new AtomicReference<>();
        instrumentation.runOnMainSync(()->activity.web.evaluateJavascript(code,value->{answer.set(value);latch.countDown();}));
        assertTrue("WebView JavaScript callback timed out",latch.await(5,TimeUnit.SECONDS));return answer.get();
    }
    private void await(String expression,long milliseconds)throws Exception{
        long until=System.currentTimeMillis()+milliseconds;
        while(System.currentTimeMillis()<until){if("true".equals(js(expression)))return;Thread.sleep(200);}
        fail("WebView condition timed out: "+expression+"; engine="+js("document.getElementById('engine-status')?.textContent"));
    }
    @Test public void bundledWorkerRunsOriginalEngineAndShowsXssEvidence()throws Exception{
        Intent intent=new Intent(instrumentation.getTargetContext(),PracticeActivity.class);intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity=(PracticeActivity)instrumentation.startActivitySync(intent);
        try{
            await("Boolean(window.BBEngine && document.getElementById('cards')?.children.length===15)",20000);
            js("(async()=>{try{const run=async(mode,price)=>{const r=await BBEngine.fetch('/academy/api/payment/pay-price/'+mode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({price})});return {status:r.status,body:await r.json()};};const weak=await run('vulnerable',1);const fixed=await run('fixed',1);const control=await run('fixed',10000);window.__bbSmoke={done:true,weak:weak.status,fixed:fixed.status,control:control.status,amount:weak.body.data.order.totals.amount_due};}catch(e){window.__bbSmoke={done:true,error:String(e)};}})();");
            await("Boolean(window.__bbSmoke?.done)",60000);
            String value=new JSONTokener(js("JSON.stringify(window.__bbSmoke)")).nextValue().toString();JSONObject result=new JSONObject(value);
            assertFalse(result.toString(),result.has("error"));assertEquals(200,result.getInt("weak"));assertEquals(422,result.getInt("fixed"));assertEquals(200,result.getInt("control"));assertEquals(1,result.getInt("amount"));

            js("(async()=>{try{const rows=await (await window.fetch('engine/advanced_catalog.json')).json();let count=0;for(const row of rows){const run=async(mode,input)=>{const r=await BBEngine.fetch('/academy/api/'+row.group+'/'+row.id+'/'+mode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});return {status:r.status,body:await r.json()};};const good=await run('fixed',row.normal),weak=await run('vulnerable',row.attack),fixed=await run('fixed',row.attack);if(good.status!==200||weak.status!==200||fixed.status!==(row.group==='jwt'?401:403)||!fixed.body.data)throw Error(row.id+' failed');count++;}window.__bbAdvanced={done:true,count};}catch(e){window.__bbAdvanced={done:true,error:String(e)};}})();");
            await("Boolean(window.__bbAdvanced?.done)",20000);
            JSONObject advanced=new JSONObject(new JSONTokener(js("JSON.stringify(window.__bbAdvanced)")).nextValue().toString());
            assertFalse(advanced.toString(),advanced.has("error"));assertEquals(12,advanced.getInt("count"));
            js("(async()=>{try{await BBEngine.fetch('/academy/api/xss/xss-html/vulnerable',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({value:'<img src=x onerror=alert(1)>'})});const evidence=await (await BBEngine.fetch('/academy/evidence?case=xss-html&mode=vulnerable')).json();const frame=document.getElementById('preview');window.addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.data?.token===evidence.token&&e.data.type==='academy-executed')window.__bbXssObserved=true;});frame.srcdoc=await BBEngine.preview(evidence.token);frame.hidden=false;}catch(e){window.__bbXssError=String(e);}})();");
            await("window.__bbXssObserved===true",15000);
        }finally{instrumentation.runOnMainSync(()->activity.finish());}
    }
}
