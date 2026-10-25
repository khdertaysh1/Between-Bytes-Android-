import http.client, importlib.util, json, pathlib, tempfile, threading, unittest
from http.server import ThreadingHTTPServer
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('http_server',ROOT/'backend/server.py');s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
class HTTPTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();s.DB=cls.tmp.name+'/http.db';s.init()
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),s.Handler);cls.port=cls.server.server_port
  cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close();cls.tmp.cleanup()
 def req(self,method,path,data=None,headers=None):
  c=http.client.HTTPConnection('127.0.0.1',self.port);h={'Content-Type':'application/json',**(headers or {})}
  c.request(method,path,json.dumps(data) if data is not None else None,h);r=c.getresponse();body=r.read();result=(r.status,dict(r.getheaders()),body);c.close();return result
 def test_http_cookie_auth_and_logout(self):
  status,h,b=self.req('POST','/api/register',{'name':'Student','email':'web@example.test','password':'long-http-test-password'})
  self.assertEqual(status,200);self.assertNotIn('token',json.loads(b));self.assertIn('HttpOnly',h['Set-Cookie']);self.assertIn('SameSite=Strict',h['Set-Cookie'])
  cookie=h['Set-Cookie'].split(';')[0]
  status,_,b=self.req('GET','/api/me',headers={'Cookie':cookie});self.assertEqual(status,200);self.assertEqual(json.loads(b)['email'],'web@example.test')
  self.req('POST','/api/logout',{},headers={'Cookie':cookie})
  self.assertEqual(self.req('GET','/api/me',headers={'Cookie':cookie})[0],401)
 def test_android_bearer(self):
  status,h,b=self.req('POST','/api/register',{'name':'Native','email':'native@example.test','password':'long-native-password'},headers={'X-Academy-Client':'android'})
  self.assertEqual(status,200);token=json.loads(b)['token']
  self.assertEqual(self.req('GET','/api/me',headers={'Authorization':'Bearer '+token})[0],200)
 def test_cross_origin_and_non_json_are_rejected(self):
  self.assertEqual(self.req('POST','/api/login',{},headers={'Origin':'https://evil.example'})[0],403)
  self.assertEqual(self.req('POST','/api/login',{},headers={'Content-Type':'text/plain'})[0],415)
 def test_invalid_body_and_unknown_route(self):
  self.assertEqual(self.req('POST','/api/login',[])[0],400)
  self.assertEqual(self.req('GET','/api/nonexistent')[0],404)
 def test_static_content_has_security_headers(self):
  status,h,b=self.req('GET','/');self.assertEqual(status,200);self.assertIn('Between Bytes',b.decode());self.assertEqual(h['X-Content-Type-Options'],'nosniff')
if __name__=='__main__':unittest.main()
