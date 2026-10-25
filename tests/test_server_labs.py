import unittest,sys,pathlib,threading,json,urllib.request,urllib.parse,http.cookiejar
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'server_labs'))
import importlib.util
_spec=importlib.util.spec_from_file_location("private_lab_server",pathlib.Path(__file__).resolve().parents[1]/"server_labs/server.py")
_module=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(_module)
PracticeServer=_module.PracticeServer
class ServerLabTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=PracticeServer(('127.0.0.1',0),0);cls.origin=cls.server.public_origin;cls.side=cls.server.author_origin
  cls.threads=[threading.Thread(target=s.serve_forever,daemon=True) for s in [cls.server,cls.server.sidecar]]
  for t in cls.threads:t.start()
 @classmethod
 def tearDownClass(cls):
  for s in [cls.server,cls.server.sidecar]:s.shutdown();s.server_close()
 def setUp(self):self.client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def request(self,path,body=None,headers=None,origin=None):
  req=urllib.request.Request((origin or self.origin)+path,body,headers or {})
  try:r=self.client.open(req)
  except urllib.error.HTTPError as e:r=e
  return r.status,r.read(),r.headers
 def test_isolated_accounts_and_weak_fixed_csrf_state(self):
  _,raw,_=self.request('/studio/session');session=json.loads(raw);sid=session['id']
  for mode,expected in [('vulnerable',200),('fixed',403)]:
   fields=urllib.parse.urlencode({'note':'Cross-origin change'}).encode()
   status,raw,_=self.request('/studio/target/'+sid+'/victim/profile/'+mode+'?case=csrf-missing',fields,{'Origin':self.side,'Content-Type':'application/x-www-form-urlencoded'})
   self.assertEqual(status,expected);self.assertEqual(json.loads(raw)['applied'],mode=='vulnerable')
  _,raw,_=self.request('/studio/state');state=json.loads(raw)['accounts'];self.assertEqual(state['victim']['vulnerable']['note'],'Cross-origin change');self.assertEqual(state['victim']['fixed']['note'],'Original profile note');self.assertEqual(state['researcher']['vulnerable']['revision'],0)
 def test_cors_headers_and_actual_second_origin_page(self):
  _,raw,_=self.request('/studio/session');sid=json.loads(raw)['id']
  for mode in ['vulnerable','fixed']:
   status,raw,headers=self.request('/studio/target/'+sid+'/victim/private/'+mode,headers={'Origin':self.side});self.assertEqual(status,200);self.assertEqual(headers.get('Access-Control-Allow-Origin'),self.side if mode=='vulnerable' else None)
  status,raw,_=self.request('/studio/document',json.dumps({'source':'<h1>My experiment</h1>'}).encode(),{'Origin':self.origin,'Content-Type':'application/json'});self.assertEqual(status,201);url=json.loads(raw)['url'];self.assertTrue(url.startswith(self.side));r=self.client.open(url);self.assertIn(b'My experiment',r.read());self.assertIn('connect-src '+self.origin,r.headers['Content-Security-Policy'])
 def test_private_sessions_and_source_files_are_scoped(self):
  _,raw,_=self.request('/studio/session');sid=json.loads(raw)['id'];other=urllib.request.build_opener();r=other.open(self.origin+'/studio/session');self.assertNotEqual(json.loads(r.read())['id'],sid)
  status,_,_=self.request('/../server_labs/server.py');self.assertEqual(status,404)
