"""Closed API and JWT lessons. Real HMAC, public demo key, fixed fixture clock.
Not a production JWT verifier. Never makes a network request.
"""
import base64, hashlib, hmac, json
from copy import deepcopy
GROUPS={'jwt','assignment'}
KEY=b'between-bytes-public-training-key-only'
NOW=2000000000

def b64(raw): return base64.urlsafe_b64encode(raw).decode().rstrip('=')
def token(claims=None, alg='HS256'):
    payload={'sub':'alice','iss':'academy','aud':'classroom','purpose':'access','exp':NOW+3600,**(claims or {})}
    head=b64(json.dumps({'alg':alg,'typ':'JWT'},separators=(',',':')).encode())
    body=b64(json.dumps(payload,separators=(',',':')).encode())
    signature=b64(hmac.new(KEY,(head+'.'+body).encode(),hashlib.sha256).digest()) if alg=='HS256' else ''
    return head+'.'+body+'.'+signature

def result(status,data,invalid,fixed,accepted):
    return {'status':status,'data':data,'impact':invalid and accepted and not fixed,
            'protected':invalid and not accepted and fixed,'legitimate':not invalid and accepted and fixed}

def execute(case,group,fixed,d,state):
    if group=='jwt':return jwt(case,fixed,d)
    return assignment(case,fixed,d,state)

def jwt(case,fixed,d):
    raw=d['token']
    if not isinstance(raw,str) or len(raw)>4096:raise ValueError('Expected bounded compact JWT')
    try:
        parts=raw.split('.')
        if len(parts)!=3:raise ValueError()
        header,claims=[json.loads(base64.b64decode(p+'='*(-len(p)%4),altchars=b'-_',validate=True)) for p in parts[:2]]
        if not isinstance(header,dict) or not isinstance(claims,dict):raise ValueError()
    except (ValueError,TypeError,UnicodeError):raise ValueError('Malformed JWT header or payload')
    signed=parts[0]+'.'+parts[1]
    signature=header.get('alg')=='HS256' and hmac.compare_digest(parts[2],b64(hmac.new(KEY,signed.encode(),hashlib.sha256).digest()))
    rules={'signature':signature,'algorithm':header.get('alg')=='HS256',
           'expiry':type(claims.get('exp')) is int and claims['exp']>NOW,
           'audience':claims.get('aud')=='classroom','issuer':claims.get('iss')=='academy',
           'purpose':claims.get('purpose')=='access','subject':claims.get('sub')=='alice'}
    ignored={'jwt-none':{'signature','algorithm'},'jwt-signature':{'signature'},'jwt-expiry':{'expiry'},
             'jwt-audience':{'audience'},'jwt-issuer':{'issuer'},'jwt-purpose':{'purpose'}}[case]
    valid=all(rules.values()); accepted=valid if fixed else all(v for k,v in rules.items() if k not in ignored)
    return result(200 if accepted else 401,{'authorized':accepted,'claims':claims,
        'signature_verified':bool(signature),'checks_trace':rules,'ignored_rules':[] if fixed else sorted(ignored),
        'private_profile':'DEMO_ALICE_PROFILE' if accepted else None,
        'model':'Real HS256; public training key; fixed server clock '+str(NOW)},not valid,fixed,accepted)

RULES={
 'assignment-role':('role','student','admin'),
 'assignment-verified':('email_verified',False,True),
 'assignment-balance':('credit',0,100000),
 'assignment-tenant':('tenant','north','south'),
 'assignment-owner':('owner','alice','bob'),
 'assignment-nested':('permissions',{'export':False},{'export':True}),
}
def assignment(case,fixed,d,state):
    patch=d['patch']
    if not isinstance(patch,dict) or len(patch)>4:raise ValueError('patch must be an object with at most four fields')
    field,initial,_=RULES[case]
    if set(patch)-{'display_name',field}:raise ValueError('Unsupported profile field')
    if not isinstance(patch.get('display_name'),str) or not 1<=len(patch['display_name'])<=80:raise ValueError('Expected bounded display_name')
    if field in patch and type(patch[field]) is not type(initial):raise ValueError('Protected field has incorrect type')
    if field=='permissions' and field in patch and (set(patch[field])!={'export'} or type(patch[field]['export']) is not bool):raise ValueError('Invalid nested permission')
    profile=state.setdefault('profile',{'display_name':'Alice',field:deepcopy(initial)})
    before=deepcopy(profile); invalid=field in patch and patch[field]!=initial
    accepted=not (fixed and invalid)
    if accepted:
        profile['display_name']=patch['display_name']
        if not fixed and field in patch:profile[field]=deepcopy(patch[field])
    return result(200 if accepted else 403,{'before':before,'after':deepcopy(profile),
        'changed':profile!=before,'accepted_fields':list(patch) if accepted and not fixed else ['display_name'] if accepted else [],
        'rejected_fields':[field] if not accepted else [],'model':'Synthetic profile store; identity and protected fields belong to server'},invalid,fixed,accepted)
