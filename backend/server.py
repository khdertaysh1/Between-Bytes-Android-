"""Pilot API and same-origin PWA host. Deploy behind HTTPS; never expose lab engines."""
import datetime as dt
import hashlib, hmac, json, math, os, pathlib, re, secrets, sqlite3, threading, time
from collections import defaultdict, deque
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from http.cookies import SimpleCookie
from urllib.parse import urlsplit
ROOT=pathlib.Path(__file__).resolve().parents[1]
CATALOG=json.loads((ROOT/'shared/catalog.json').read_text())
LABS=CATALOG['labs']; DB=os.environ.get('ACADEMY_DB',str(ROOT/'academy.db'))
LOCK=threading.RLock(); LIMITS=defaultdict(deque)
class APIError(Exception):
    def __init__(self,status,message): self.status,self.message=status,message

def connect():
    c=sqlite3.connect(DB,timeout=15);c.row_factory=sqlite3.Row
    c.execute('PRAGMA foreign_keys=ON');return c

def init():
    with connect() as c:
        c.executescript('''
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,name TEXT,salt TEXT,password TEXT);
        CREATE TABLE IF NOT EXISTS sessions(digest TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires INTEGER);
        CREATE TABLE IF NOT EXISTS completions(user_id TEXT REFERENCES users(id),lab TEXT,score INTEGER,day TEXT,PRIMARY KEY(user_id,lab));
        CREATE TABLE IF NOT EXISTS attempts(user_id TEXT REFERENCES users(id),event TEXT,result TEXT,PRIMARY KEY(user_id,event));
        ''')

def password_hash(password,salt):
    return hashlib.pbkdf2_hmac('sha256',password.encode(),bytes.fromhex(salt),600000).hex()

def profile(c,uid):
    u=c.execute('SELECT name,email FROM users WHERE id=?',(uid,)).fetchone()
    rows=c.execute('SELECT lab,score,day FROM completions WHERE user_id=?',(uid,)).fetchall()
    days={r['day'] for r in rows};today=dt.datetime.now(dt.timezone.utc).date()
    cursor=today if today.isoformat() in days else today-dt.timedelta(days=1)
    streak=0
    while cursor.isoformat() in days:streak+=1;cursor-=dt.timedelta(days=1)
    return {'name':u['name'],'email':u['email'],'completed':{r['lab']:r['score'] for r in rows},'days':sorted(days),'xp':150*len(rows),'streak':streak}

def authenticate(c,token):
    s=c.execute('SELECT user_id FROM sessions WHERE digest=? AND expires>?',(hashlib.sha256(token.encode()).hexdigest(),int(time.time()))).fetchone()
    if not s:raise APIError(401,'سجّل الدخول للمتابعة.')
    return s['user_id']

def auth(c,action,data):
    email=str(data.get('email','')).strip().lower();pw=data.get('password','')
    if not isinstance(pw,str) or not 12<=len(pw)<=256 or not re.fullmatch(r'[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}',email):raise APIError(400,'أدخل بريداً صالحاً وكلمة مرور من 12 إلى 256 محرفاً.')
    u=c.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone()
    if action=='register':
        name=str(data.get('name','')).strip()[:60]
        if not name:raise APIError(400,'أدخل اسمك.')
        if u:raise APIError(409,'تعذر إنشاء الحساب بهذه البيانات. جرّب تسجيل الدخول.')
        salt=secrets.token_hex(16);uid=secrets.token_hex(16)
        c.execute('INSERT INTO users VALUES(?,?,?,?,?)',(uid,email,name,salt,password_hash(pw,salt)))
    else:
        salt=u['salt'] if u else '00'*16
        digest=password_hash(pw,salt)
        if not u or not hmac.compare_digest(digest,u['password']):raise APIError(401,'بيانات الدخول غير صحيحة.')
        uid=u['id']
    token=secrets.token_urlsafe(32)
    c.execute('DELETE FROM sessions WHERE expires<=?',(int(time.time()),))
    c.execute('INSERT INTO sessions VALUES(?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),uid,int(time.time())+604800))
    return {'token':token,'profile':profile(c,uid)}

def attempt(c,uid,data):
    event=data.get('event','');lab_id=data.get('lab','');answers=data.get('answers')
    if not isinstance(event,str) or not re.fullmatch('[A-Za-z0-9-]{16,80}',event):raise APIError(400,'معرّف محاولة غير صالح.')
    old=c.execute('SELECT result FROM attempts WHERE user_id=? AND event=?',(uid,event)).fetchone()
    if old:return json.loads(old['result'])|{'profile':profile(c,uid)}
    index=next((i for i,l in enumerate(LABS) if l['id']==lab_id),None)
    if index is None:raise APIError(404,'المختبر غير موجود.')
    if index and not c.execute('SELECT 1 FROM completions WHERE user_id=? AND lab=?',(uid,LABS[index-1]['id'])).fetchone():raise APIError(403,'أكمل المستوى السابق أولاً.')
    quiz=LABS[index]['quiz']
    if not isinstance(answers,list) or len(answers)!=len(quiz) or any(type(a)!=int or not 0<=a<len(q['options']) for a,q in zip(answers,quiz)):raise APIError(400,'إجابات غير مكتملة.')
    score=math.floor(100*sum(a==q['answer'] for a,q in zip(answers,quiz))/len(quiz));passed=score>=80
    if passed:
        day=dt.datetime.now(dt.timezone.utc).date().isoformat()
        c.execute('INSERT INTO completions VALUES(?,?,?,?) ON CONFLICT(user_id,lab) DO UPDATE SET score=MAX(score,excluded.score)',(uid,lab_id,score,day))
    result={'score':score,'passed':passed}
    c.execute('INSERT INTO attempts VALUES(?,?,?)',(uid,event,json.dumps(result)))
    return result|{'profile':profile(c,uid)}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'web'),**kwargs)
    def log_message(self,*args):pass
    def end_headers(self):
        self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','same-origin')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")
        super().end_headers()
    def send_json(self,status,data,token=None,clear=False):
        body=json.dumps(data,ensure_ascii=False).encode();self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store')
        self.send_header('Content-Length',str(len(body)))
        secure='; Secure' if os.environ.get('ACADEMY_SECURE_COOKIE')=='1' else ''
        if token:self.send_header('Set-Cookie','bb_session='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800'+secure)
        if clear:self.send_header('Set-Cookie','bb_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'+secure)
        self.end_headers();self.wfile.write(body)
    def token(self):
        authorization=self.headers.get('Authorization','')
        if authorization.startswith('Bearer '):return authorization[7:]
        try:
            cookies=SimpleCookie(self.headers.get('Cookie',''));return cookies['bb_session'].value if 'bb_session' in cookies else ''
        except Exception:return ''
    def do_GET(self):
        path=urlsplit(self.path).path
        if path=='/api/catalog':return self.send_json(200,CATALOG)
        if path=='/api/health':return self.send_json(200,{'ok':True,'version':CATALOG['version']})
        if path=='/api/me':
            try:
                with connect() as c:return self.send_json(200,profile(c,authenticate(c,self.token())))
            except APIError as e:return self.send_json(e.status,{'error':e.message})
        if path.startswith('/api/'):return self.send_json(404,{'error':'غير موجود.'})
        if path=='/':self.path='/index.html'
        super().do_GET()
    def do_POST(self):
        try:
            origin=self.headers.get('Origin')
            if origin and urlsplit(origin).netloc!=self.headers.get('Host'):raise APIError(403,'Origin mismatch')
            if 'application/json' not in self.headers.get('Content-Type',''):raise APIError(415,'JSON required')
            try:length=int(self.headers.get('Content-Length','0'))
            except ValueError:raise APIError(400,'Invalid length')
            if not 0<length<=32768:raise APIError(413,'Request too large')
            try:data=json.loads(self.rfile.read(length))
            except (ValueError,UnicodeError):raise APIError(400,'Invalid JSON')
            if not isinstance(data,dict):raise APIError(400,'JSON object required')
            path=urlsplit(self.path).path
            with LOCK:
                if path in ('/api/register','/api/login'):
                    # Bounded pilot throttle. Production requires a shared edge rate limiter.
                    now=time.monotonic();key=self.client_address[0];queue=LIMITS[key]
                    while queue and queue[0]<now-300:queue.popleft()
                    if len(queue)>=15:raise APIError(429,'محاولات كثيرة. انتظر خمس دقائق.')
                    queue.append(now)
                with connect() as c:
                    if path in ('/api/register','/api/login'):
                        result=auth(c,path[5:],data);token=result['token'];c.commit()
                        if self.headers.get('X-Academy-Client')!='android':result={'profile':result['profile']}
                        return self.send_json(200,result,token=token)
                    uid=authenticate(c,self.token())
                    if path=='/api/attempt':
                        result=attempt(c,uid,data);c.commit();return self.send_json(200,result)
                    if path=='/api/logout':
                        c.execute('DELETE FROM sessions WHERE digest=?',(hashlib.sha256(self.token().encode()).hexdigest(),))
                        c.commit();return self.send_json(200,{'ok':True},clear=True)
                    raise APIError(404,'غير موجود.')
        except APIError as e:self.send_json(e.status,{'error':e.message})
        except (sqlite3.Error,ValueError):self.send_json(500,{'error':'تعذر إتمام الطلب.'})
if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--host',default='127.0.0.1');p.add_argument('--port',type=int,default=8080);a=p.parse_args()
    init();print(f'Between Bytes Academy: http://{a.host}:{a.port}',flush=True)
    ThreadingHTTPServer((a.host,a.port),Handler).serve_forever()
