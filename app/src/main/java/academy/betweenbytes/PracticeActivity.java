package academy.betweenbytes;
import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.net.Uri;
import android.webkit.*;
import android.widget.*;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
import java.util.Map;
import java.util.Collections;

/** Bundled, network-isolated practice workspace. No JavaScript-to-native bridge. */
public class PracticeActivity extends Activity {
    WebView web;
    private static final String HOST="appassets.androidplatform.net";
    @Override public void onCreate(Bundle state){super.onCreate(state);
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(16,25,24));
        Button back=new Button(this);back.setText("→ العودة للتطبيق · المختبر يعمل محلياً");back.setOnClickListener(v->finish());root.addView(back);
        web=new WebView(this);root.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
        root.setOnApplyWindowInsetsListener((v,in)->{v.setPadding(0,in.getSystemWindowInsetTop(),0,in.getSystemWindowInsetBottom());return in;});
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setSupportMultipleWindows(false);settings.setJavaScriptCanOpenWindowsAutomatically(false);
        WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri url=request.getUrl();if(!"https".equals(url.getScheme())||!HOST.equals(url.getHost()))return blocked();
                WebResourceResponse result=loader.shouldInterceptRequest(url);if(result==null)return blocked();
                String path=url.getPath();if(path!=null&&(path.endsWith(".mjs")||path.endsWith(".js")))result.setMimeType("text/javascript");
                if(path!=null&&path.endsWith(".wasm"))result.setMimeType("application/wasm");
                result.setResponseHeaders(Collections.singletonMap("X-Content-Type-Options","nosniff"));return result;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri url=request.getUrl();boolean allowed="https".equals(url.getScheme())&&HOST.equals(url.getHost());if(!allowed)runOnUiThread(()->Toast.makeText(PracticeActivity.this,"هذا المختبر يعمل على الملفات المرفقة داخل التطبيق.",Toast.LENGTH_SHORT).show());return !allowed;}
        });
        String id=getIntent().getStringExtra("case");String hash=id!=null&&id.matches("[a-z0-9-]+")?"#/"+id:"";
        web.loadUrl("https://"+HOST+"/assets/web/index.html"+hash);
    }
    private WebResourceResponse blocked(){return new WebResourceResponse("text/plain","utf-8",403,"Blocked",Collections.singletonMap("Cache-Control","no-store"),new ByteArrayInputStream("External transport is disabled in practice mode".getBytes(java.nio.charset.StandardCharsets.UTF_8)));}
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else finish();}
    @Override protected void onDestroy(){web.stopLoading();web.loadUrl("about:blank");web.destroy();super.onDestroy();}
}
