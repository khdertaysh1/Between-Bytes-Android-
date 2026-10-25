import importlib.util,json,pathlib,tempfile,unittest,uuid
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('server',ROOT/'backend/server.py');s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
class AcademyTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();s.DB=self.tmp.name+'/test.db';s.init()
  with s.connect() as c:
   self.a=s.auth(c,'register',{'name':'A','email':'a@example.test','password':'Long-password-123!'})
   self.b=s.auth(c,'register',{'name':'B','email':'b@example.test','password':'Long-password-456!'})
   self.uid=s.authenticate(c,self.a['token']);self.other=s.authenticate(c,self.b['token'])
 def tearDown(self):self.tmp.cleanup()
 def submission(self,i=0,wrong=False,event=None):
  l=s.LABS[i];return {'event':event or str(uuid.uuid4()),'lab':l['id'],'answers':[(q['answer']+1)%len(q['options']) if wrong else q['answer'] for q in l['quiz']]}
 def test_login_and_wrong_password(self):
  with s.connect() as c:
   r=s.auth(c,'login',{'email':'A@example.test','password':'Long-password-123!'})
   self.assertEqual(s.authenticate(c,r['token']),self.uid)
   with self.assertRaises(s.APIError):s.auth(c,'login',{'email':'a@example.test','password':'Long-password-nope'})
 def test_levels_cannot_be_skipped(self):
  with s.connect() as c:
   with self.assertRaises(s.APIError) as e:s.attempt(c,self.uid,self.submission(1))
   self.assertEqual(e.exception.status,403)
 def test_wrong_answers_do_not_award_points(self):
  with s.connect() as c:
   r=s.attempt(c,self.uid,self.submission(wrong=True));self.assertFalse(r['passed']);self.assertEqual(r['profile']['xp'],0)
 def test_retries_are_idempotent_and_repeats_do_not_inflate_xp(self):
  with s.connect() as c:
   a=self.submission();first=s.attempt(c,self.uid,a);again=s.attempt(c,self.uid,a)
   repeat=s.attempt(c,self.uid,self.submission());self.assertEqual(first['score'],100)
   self.assertEqual(again['profile']['xp'],150);self.assertEqual(repeat['profile']['xp'],150)
   second=s.attempt(c,self.uid,self.submission(1));self.assertEqual(second['profile']['xp'],300)
 def test_account_data_isolation(self):
  with s.connect() as c:
   s.attempt(c,self.uid,self.submission());self.assertEqual(s.profile(c,self.other)['xp'],0)
   with self.assertRaises(s.APIError):s.authenticate(c,'made-up-token')
 def test_server_ignores_client_points_and_dates(self):
  with s.connect() as c:
   data=self.submission();data.update(xp=999999,day='2030-01-01',score=100)
   r=s.attempt(c,self.uid,data);self.assertEqual(r['profile']['xp'],150);self.assertNotIn('2030-01-01',r['profile']['days'])
 def test_invalid_answers_rejected(self):
  with s.connect() as c:
   for value in [[],['0']*6,[True]*6,[-1]*6,[99]*6]:
    a=self.submission();a['answers']=value
    with self.assertRaises(s.APIError):s.attempt(c,self.uid,a)
 def test_all_modules_can_be_completed_sequentially(self):
  with s.connect() as c:
   for i in range(len(s.LABS)):self.assertTrue(s.attempt(c,self.uid,self.submission(i))['passed'])
   self.assertEqual(s.profile(c,self.uid)['xp'],150*len(s.LABS))
 def test_offline_replay_does_not_create_historical_streak(self):
  with s.connect() as c:
   a=self.submission();a['day']='2020-01-01';r=s.attempt(c,self.uid,a)
   self.assertEqual(r['profile']['streak'],1);self.assertEqual(len(r['profile']['days']),1)
 def test_shared_assets_identical(self):
  source=(ROOT/'shared/catalog.json').read_bytes()
  self.assertEqual(source,(ROOT/'web/catalog.json').read_bytes());self.assertEqual(source,(ROOT/'app/src/main/assets/catalog.json').read_bytes())
 def test_logout_revokes_session(self):
  with s.connect() as c:
   c.execute('DELETE FROM sessions WHERE user_id=?',(self.uid,))
   with self.assertRaises(s.APIError):s.authenticate(c,self.a['token'])
if __name__=='__main__':unittest.main()
