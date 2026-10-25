"""Private two-origin browser exercises alongside the static web app. No real accounts."""
import argparse,json,os,pathlib,re,secrets,threading,time
from types import SimpleNamespace
from http.cookies import SimpleCookie
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler,BaseHTTPRequestHandler
from urllib.parse import urlsplit,parse_qs
from studio_browser import handle,page_document,TARGET_JS,TARGET_CSS
ROOT=pathlib.Path(__file__).resolve().parents[1]/'web'
class PracticeServer(ThreadingHTTPServer):
 def __init__(self,address,side_port=4174,public_origin=None,author_origin=None):
  super().__init__(address,MainHandler);host,port=self.server_address;self.public_origin=public_origin or 'http://127.0.0.1:'+str(port);self.contexts={};self.lock=threading.RLock()
  self.sidecar=ThreadingHTTPServer((address[0],side_port),SideHandler);self.sidecar.parent=self
  self.author_origin=author_origin or 'http://127.0.0.1:'+str(self.sidecar.server_port)
 def context(self,header):
  try:key=SimpleCookie(header or '').get('bb_room');key=key.value if key else ''
  except Exception:key=''
  now=time.monotonic()
  with self.lock:
   for old,c in list(self.contexts.items()):
    if now-c.touched>1800:del self.contexts[old]
   if key in self.contexts:self.contexts[key].touched=now;return key,self.contexts[key],False
   if len(self.contexts)>=32:raise ValueError('Session limit reached')
   key=secrets.token_hex(24);c=SimpleNamespace(touched=now);self.contexts[key]=c;return key,c,True
class MainHandler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def log_message(self,*args):pass
 def list_directory(self,path):self.send_error(404);return None
 def reply(self,status,data,ctype='application/json; charset=utf-8',csp=None,headers=None):
  raw=data if isinstance(data,bytes) else json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type',ctype);self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
  if csp:self.send_header('Content-Security-Policy',csp)
  for key,value in (headers or {}).items():
   for v in value if isinstance(value,list) else [value]:self.send_header(key,v)
  self.end_headers();self.wfile.write(raw)
 def route(self,method):
  parsed=urlsplit(self.path)
  if parsed.path=='/server-capabilities.json':self.reply(200,{'two_origins':True,'private_training':True,'main':self.server.public_origin,'author_origin':self.server.author_origin});return True
  if parsed.path in {'/studio-target.js','/studio-target.css'}:
   raw=TARGET_JS if parsed.path.endswith('.js') else TARGET_CSS;self.reply(200,raw.encode(),'text/javascript' if parsed.path.endswith('.js') else 'text/css');return True
  if not parsed.path.startswith('/studio/'):return False
  try:
   key,context,new=self.server.context(self.headers.get('Cookie'))
   original=self.reply
   if new:
    def reply(*args,**kwargs):
     headers=kwargs.setdefault('headers',{});cookies=headers.get('Set-Cookie',[]);cookies=cookies if isinstance(cookies,list) else [cookies];headers['Set-Cookie']=cookies+['bb_room='+key+'; HttpOnly; SameSite=Lax; Path=/'];original(*args,**kwargs)
    self.reply=reply
   with self.server.lock:return handle(self,context,parsed,method)
  except (ValueError,TypeError) as error:self.reply(400,{'error':str(error)});return True
 def do_GET(self):
  if not self.route('GET'):super().do_GET()
 def do_POST(self):
  if not self.route('POST'):self.reply(404,{'error':'Unknown training route'})
class SideHandler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  parent=self.server.parent;match=re.fullmatch(r'/studio/page/([a-f0-9]{32})/([a-f0-9]{32})',urlsplit(self.path).path)
  if not match:self.send_error(404);return
  sid,key=match.groups()
  with parent.lock:
   studio=next((c.studio for c in parent.contexts.values() if hasattr(c,'studio') and c.studio.id==sid),None)
   entry=studio.documents.get(key) if studio else None
   if not entry:self.send_error(404);return
   raw=page_document(entry,parent.public_origin,key,'ar').encode()
  self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(raw)));self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src "+parent.public_origin+"; form-action "+parent.public_origin+"; frame-ancestors "+parent.public_origin+"; base-uri 'none'");self.end_headers();self.wfile.write(raw)
def public(port):
 name=os.environ.get('CODESPACE_NAME');domain=os.environ.get('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN')
 return 'https://'+name+'-'+str(port)+'.'+domain if name and domain else None
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=4173);parser.add_argument('--side-port',type=int,default=4174);args=parser.parse_args()
 server=PracticeServer((os.environ.get('BB_BIND','127.0.0.1'),args.port),args.side_port,os.environ.get('BB_PUBLIC_ORIGIN') or public(args.port),os.environ.get('BB_AUTHOR_ORIGIN') or public(args.side_port))
 threading.Thread(target=server.sidecar.serve_forever,daemon=True).start();print('Private lab:',server.public_origin,'Author origin:',server.author_origin,flush=True)
 try:server.serve_forever()
 finally:server.sidecar.shutdown();server.server_close();server.sidecar.server_close()
