"""Transport adapter for the original local lab engine; no external HTTP service."""
import json,re
from urllib.parse import urlsplit,parse_qs
from academy import Academy,CATALOG,CASES,preview_document
from academy_http import response
from commerce import snapshot
academy=Academy()

def reply(status,body,headers=None):
 return {'status':status,'body':body,'headers':{'Content-Type':'application/json; charset=utf-8','X-BB-Execution':'local-python-wasm',**(headers or {})}}

def dispatch(request):
 try:
  url=urlsplit(request['path']);path=url.path;method=request.get('method','GET');query=parse_qs(url.query)
  if path=='/rooms/session':return reply(200,{'local':True})
  if path=='/academy/catalog':return reply(200,{'version':'0.3.0','cases':CATALOG})
  if path=='/academy/reset':
   case=request.get('fields',{}).get('case')
   if case not in CASES:raise ValueError('Unknown case')
   academy.reset(case);return reply(200,{'reset':case})
  if path in {'/academy/evidence','/academy/resource'}:
   case=query.get('case',[''])[0];mode=query.get('mode',[''])[0]
   if case not in CASES or mode not in {'fixed','vulnerable'}:raise ValueError('Unknown case or variant')
   if path.endswith('/evidence'):return reply(200,academy.latest.get((case,mode),{'checks':{},'flag':None}))
   if not case.startswith('pay-'):return reply(404,{'error':'Checkout readback only'})
   data=snapshot(academy.states.setdefault((case,mode),{}),case[4:])
   return reply(200,{'data':data},{'ETag':'"order100-r'+str(data['order']['revision'])+'"'})
  match=re.fullmatch(r'/academy/api/([a-z]+)/([a-z0-9-]+)/(vulnerable|fixed)',path)
  if match:
   group,case,mode=match.groups()
   if case not in CASES or CASES[case]['group']!=group:return reply(404,{'error':{'message':'Unknown local route'}})
   if method!='POST':return reply(405,{'error':{'message':'Use POST'}},{'Allow':'POST'})
   data=request.get('input');headers={k.lower():v for k,v in request.get('headers',{}).items()}
   content_type=headers.get('content-type','application/json').split(';')[0].strip().lower()
   if content_type!='application/json':return reply(415,{'error':{'code':'unsupported_media_type','message':'This virtual endpoint requires application/json'}})
   if group=='rate' and isinstance(data,dict) and 'source' in data and headers.get('x-forwarded-for'):data={**data,'source':headers['x-forwarded-for']}
   result=academy.run(case,mode,data);status,body,extra=response(academy,case,mode,result)
   return reply(status,body,extra)
  return reply(404,{'error':{'message':'Unknown virtual route'}})
 except (ValueError,TypeError,RecursionError) as error:
  return reply(400,{'error':{'code':'invalid_request','message':str(error)[:200]}})

def preview(token):
 entry=academy.previews.get(token)
 if entry is None:raise ValueError('Preview expired; resend the request')
 case,mode,value,_=entry
 html=preview_document(*entry)
 # srcdoc has no URL query/hash: feed the fixture URL source to the same browser sink.
 safe=json.dumps(value).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
 html=html.replace('decodeURIComponent(location.hash.slice(1))',safe)
 html=html.replace('new URLSearchParams(location.search).get("search")||""',safe)
 csp="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"
 return '<!doctype html><meta http-equiv="Content-Security-Policy" content="'+csp+'">'+html.replace('<!doctype html>','',1)

def invoke(raw):
 request=json.loads(raw)
 if request.get('action')=='health':return json.dumps({'ready':True,'cases':len(CATALOG)})
 if request.get('action')=='preview':return json.dumps({'html':preview(request['token'])})
 return json.dumps(dispatch(request),ensure_ascii=False)
