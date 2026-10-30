"""Bounded executable lessons: deterministic schedules, OAuth fixtures, cache pipelines,
a documented GraphQL subset, and XML with closed resource resolution.
No sockets, host-file reads, background threads, or unbounded expansion.
"""
from copy import deepcopy
import base64, hashlib, json, posixpath, re, xml.etree.ElementTree as ET
from urllib.parse import urlsplit, unquote
from io import BytesIO
from zipfile import ZipFile

GROUPS={'race','oauth','cache','graphql','xml'}

def string(d,key,limit=4096):
    v=d.get(key)
    if not isinstance(v,str) or len(v)>limit:raise ValueError('Expected bounded string: '+key)
    return v

def number(d,key,low,high):
    v=d.get(key)
    if type(v) is not int or not low<=v<=high:raise ValueError('Expected bounded integer: '+key)
    return v

def boolean(d,key):
    v=d.get(key)
    if type(v) is not bool:raise ValueError('Expected boolean: '+key)
    return v

def answer(status,data,invalid,fixed,impact,code='policy_rejected'):
    return {'status':status,'data':data,'impact':bool(impact and not fixed),
            'protected':bool(fixed and invalid and not impact),
            'legitimate':bool(fixed and not invalid and status<400), 'error_code':code}

def execute(case,group,fixed,d,state):
    return {'race':race,'oauth':oauth,'cache':cache,'graphql':graphql,'xml':xml}[group](case,fixed,d,state)

# A round executes READ -> CHECK -> WRITE events, serially or in a controlled overlap.
RACES={
 'race-coupon':('coupon_redemptions',1,1),'race-gift':('gift_debits',10000,6000),
 'race-refund':('refunds',10000,6000),'race-stock':('reservations',1,1),
 'race-invite':('invite_uses',1,1),'race-reset':('reset_uses',1,1),
 'race-username':('username_alice',1,1),
}
def race(case,fixed,d,state):
    overlap=boolean(d,'overlap');count=number(d,'requests',1,4)
    timeline=[];operations=[];invalid=overlap and count>1
    if case in RACES:
        name,budget,cost=RACES[case];remaining=budget;ledger=[]
        def read(i):
            snapshot=remaining;timeline.append({'request':i,'event':'read','remaining':snapshot});return snapshot
        snapshots=[read(i+1) for i in range(count)] if overlap and not fixed else None
        for i in range(count):
            seen=snapshots[i] if snapshots is not None else read(i+1)
            allowed=seen>=cost
            timeline.append({'request':i+1,'event':'check','observed':seen,'allowed':allowed})
            if allowed:
                remaining=seen-cost;ledger.append({'request':i+1,'amount':cost,'resource':name})
                timeline.append({'request':i+1,'event':'write','remaining':remaining})
            operations.append({'request':i+1,'status':200 if allowed else 409,'applied':allowed})
        violated=sum(x['amount'] for x in ledger)>budget
        before={'resource':name,'budget':budget,'spent':0}
        after={'resource':name,'remaining':remaining,'spent':sum(x['amount'] for x in ledger),'records':ledger}
    else:
        # Another actor changes a protected value after the check and before its use.
        original={'race-email':'alice@example.test','race-permission':'allowed','race-file':'SAFE_AVATAR'}[case]
        changed={'race-email':'unverified@example.test','race-permission':'revoked','race-file':'UNSCANNED_FILE'}[case]
        current=original;checked=original;timeline.append({'event':'check','value':checked,'version':1})
        if invalid:current=changed;timeline.append({'event':'concurrent_change','value':current,'version':2})
        allowed=not fixed or current==checked
        used=current if allowed else None
        timeline.append({'event':'compare_version_and_use' if fixed else 'use_without_recheck','value':used,'allowed':allowed})
        operations=[{'status':200 if allowed else 409,'applied':allowed}]
        violated=allowed and current!=checked
        before={'value':original,'version':1};after={'current':current,'used':used,'operation_applied':allowed,'version':2 if invalid else 1}
    state['last']=deepcopy(after)
    blocked=sum(not x['applied'] for x in operations)
    status=207 if blocked and any(x['applied'] for x in operations) else 409 if blocked else 200
    return answer(status,{'before':before,'after':after,'operations':operations,'timeline':timeline,'invariant_violated':violated,
      'model':'Deterministic event scheduler, not real network concurrency; each submission starts a fresh fixture transaction.'},invalid,fixed,violated,'concurrent_state_conflict')

CALLBACK='https://academy.test/callback'
CODES={'code-academy':{'client':'academy','redirect':CALLBACK},'code-other':{'client':'other-app','redirect':'https://other.test/callback'},'code-alt':{'client':'academy','redirect':'https://academy.test/alternate'}}
VERIFIER='training-verifier-alice'
def s256(value):return base64.urlsafe_b64encode(hashlib.sha256(value.encode()).digest()).decode().rstrip('=')
CHALLENGE=s256(VERIFIER)
def oauth(case,fixed,d,state):
    rules={};details={};issued=[];errors=[];linked=None;invalid=False;subject='alice'
    if case=='oauth-redirect':
        uri=string(d,'redirect_uri');valid=uri==CALLBACK
        accepted=valid if fixed else uri.startswith('https://academy.test')
        rules={'exact_registered_redirect':valid};details={'destination':uri if accepted else None};invalid=not valid
    elif case in {'oauth-state','oauth-state-binding'}:
        provider_subject=string(d,'subject')
        if provider_subject not in {'external-alice','external-bob'}:raise ValueError('Unknown fixture provider subject')
        subject='bob' if provider_subject=='external-bob' else 'alice'
        value=string(d,'state');owner={'state-alice':'alice','state-bob':'bob'}.get(value)
        valid=owner=='alice';accepted=valid if fixed else (True if case=='oauth-state' else owner is not None)
        rules={'state_exists':owner is not None,'state_bound_to_session':valid};details={'session_actor_before':'alice','session_actor_after':subject if accepted else 'alice','state_owner':owner};invalid=not valid
    elif case in {'oauth-pkce','oauth-pkce-downgrade'}:
        verifier=string(d,'verifier');method=string(d,'method') if case.endswith('downgrade') else 'S256'
        valid=method=='S256' and s256(verifier)==CHALLENGE
        accepted=valid if fixed else (True if case=='oauth-pkce' else method=='' or valid)
        rules={'pkce_required':True,'method_s256':method=='S256','challenge_matches':s256(verifier)==CHALLENGE};invalid=not valid
    elif case in {'oauth-code-client','oauth-code-redirect'}:
        code=string(d,'code');record=CODES.get(code)
        field='client_id' if case.endswith('client') else 'redirect_uri';value=string(d,field)
        valid=record is not None and (record['client']==value=='academy' if field=='client_id' else record['redirect']==value==CALLBACK)
        accepted=valid if fixed else record is not None
        rules={'code_exists':record is not None,'code_bound_to_'+field:valid};details={'code_binding':record};invalid=not valid
    elif case=='oauth-code-reuse':
        flow=string(d,'flow',64);uses=number(d,'uses',1,3);used=state.setdefault('consumed',[]);invalid=uses>1 or flow in used
        for i in range(uses):
            if fixed and flow in used:errors.append({'attempt':i+1,'status':401,'code':'authorization_code_used'})
            else:
                issued.append('DEMO_ACCESS_'+flow+'_'+str(i+1))
                if flow not in used:used.append(flow)
        accepted=bool(issued);rules={'single_use_enforced':fixed};details={'tokens_issued':len(issued),'operations':[{'status':200} for _ in issued]+errors}
        bad=len(issued)>1 or (invalid and not fixed and bool(issued))
        status=207 if errors and issued else 401 if errors else 200
        return answer(status,{'authorized':accepted,'tokens':issued,'checks_trace':rules,**details,'model':'Closed authorization-code fixture; flow names isolate control and attack codes.'},invalid,fixed,bad,'authorization_code_used')
    elif case=='oauth-link-csrf':
        intent=string(d,'state');subject=string(d,'subject');valid=intent=='link-alice' and subject=='external-alice'
        accepted=valid if fixed else subject in {'external-alice','external-bob'}
        invalid=not valid;rules={'session_bound_link_intent':valid};linked=subject if accepted else None
    elif case=='oauth-unverified-email':
        email=string(d,'email');verified=boolean(d,'email_verified');valid=email=='alice@example.test' and verified
        accepted=valid if fixed else email=='alice@example.test';invalid=not valid
        rules={'provider_email_verified':verified,'email_matches_local_account':email=='alice@example.test'};linked='external-claim' if accepted else None
    else:raise ValueError('Unknown OAuth case')
    if accepted:state['last_subject']=linked or 'alice'
    return answer(200 if accepted else 401,{'authorized':accepted,'private_profile':('DEMO_'+subject.upper()+'_PROFILE') if accepted else None,
      'linked_subject':linked,'checks_trace':rules,**details,'model':'Local authorization-provider fixture. Provider claims and code bindings are fixed training records, not live OAuth or signed OIDC.'},invalid,fixed,invalid and accepted,'oauth_verification_failed')

# A real dictionary cache and two request contexts: prime, then an independent victim read.
def cache(case,fixed,d,state):
    field={'cache-forwarded-host':'forwarded_host','cache-query':'next','cache-header':'theme','cache-cookie':'customer_class','cache-get-body':'body'}.get(case,'path')
    value=string(d,field,300);cache_store={};events=[];private='DEMO_ALICE_BILLING'
    normal='academy.test' if case=='cache-forwarded-host' else '/public/site.css' if field=='path' else 'default'
    bad=value!=normal
    headers={'Cache-Control':'public, max-age=60'};session_private=False
    if case=='cache-forwarded-host':
        prime_key='/home';victim_key='/home';origin='https://'+('academy.test' if fixed else value)+'/assets/app.js';expected='https://academy.test/assets/app.js'
    elif case=='cache-query':
        prime_key='/continue'+('?next='+value if fixed else '');victim_key='/continue'+('?next=default' if fixed else '')
        origin='/account' if value=='default' else 'https://untrusted.test/landing';expected='/account'
    elif case=='cache-header':
        prime_key='/theme'+('|'+value if fixed else '');victim_key='/theme'+('|default' if fixed else '')
        origin='/safe.css' if value=='default' else 'https://untrusted.test/theme.css';expected='/safe.css'
    elif case=='cache-cookie':
        prime_key='/price'+('|'+value if fixed else '');victim_key='/price'+('|default' if fixed else '')
        origin='DEMO_CONTRACT_PRICE' if bad else 'PUBLIC_PRICE';expected='PUBLIC_PRICE'
    elif case=='cache-get-body':
        prime_key='/search'+('|body='+value if fixed else '');victim_key='/search'+('|body=default' if fixed else '')
        origin='PUBLIC_RESULTS' if not bad else 'POISONED_TRAINING_BANNER';expected='PUBLIC_RESULTS'
    else:
        # Origin treats suffixes/delimiters/normalized paths as the account route.
        paths={'cache-private':'/account','cache-extension':'/account/profile.css','cache-delimiter':'/account;style.css','cache-normalization':'/static/../account','cache-control':'/account/summary.css'}
        path=value
        if path not in set(paths.values())|{'/public/site.css'}:raise ValueError('Unknown closed origin route')
        app_path=posixpath.normpath(unquote(path).split(';')[0])
        if case=='cache-extension' and app_path=='/account/profile.css':app_path='/account'
        sensitive=app_path.startswith('/account')
        origin=private if sensitive else 'PUBLIC_STYLES';expected='LOGIN_REQUIRED' if sensitive else 'PUBLIC_STYLES'
        session_private=sensitive;headers={'Cache-Control':'private, no-store' if sensitive else 'public, max-age=60'}
        prime_key=path;victim_key=path
    # Fixed admission honors privacy; key partitioning handles representation differences.
    admission=not (fixed and session_private)
    if admission:cache_store[prime_key]=origin
    events.append({'actor':'prime','key':prime_key,'origin_status':200,'cache_store':admission,'cache_control':headers['Cache-Control'],'response':origin})
    hit=victim_key in cache_store
    victim=cache_store[victim_key] if hit else expected
    victim_status=200 if hit or expected!='LOGIN_REQUIRED' else 401
    events.append({'actor':'victim','key':victim_key,'cache':'HIT' if hit else 'MISS','status':victim_status,'response':victim})
    impact=bad and victim!=expected
    state['cache']=deepcopy(cache_store)
    return answer(200,{'prime_response':origin,'victim_response':victim,'victim_status':victim_status,'cache_key':prime_key,'victim_key':victim_key,
      'cache_entries':cache_store,'cache_control':headers,'requests':events,'cross_context_effect':impact,
      'model':'Closed origin/cache pipeline. Each submission starts cold and performs a prime plus victim read; outer HTTP 200 is the experiment result, not every inner response.'},bad,fixed,impact)

# Small documented GraphQL grammar: operations, fields, aliases, scalar args and selections.
class GQL:
    def __init__(self,text):
        if not isinstance(text,str) or len(text)>4096:raise ValueError('GraphQL query must be a bounded string')
        self.tokens=[];pos=0;pattern=re.compile(r'\s+|#[^\n]*|[A-Za-z_][A-Za-z_0-9]*|-?\d+|"(?:[^"\\]|\\.)*"|[{}():,]')
        while pos<len(text):
            m=pattern.match(text,pos)
            if not m:raise ValueError('Unsupported GraphQL syntax at '+str(pos))
            token=m.group();pos=m.end()
            if not token.isspace() and not token.startswith('#') and token!=',':self.tokens.append(token)
        self.i=0;self.nodes=0
    def pop(self,expected=None):
        if self.i>=len(self.tokens):raise ValueError('Incomplete GraphQL operation')
        t=self.tokens[self.i];self.i+=1
        if expected is not None and t!=expected:raise ValueError('Expected '+expected)
        return t
    def peek(self):return self.tokens[self.i] if self.i<len(self.tokens) else None
    def selection(self,depth=0):
        if depth>12:raise ValueError('Local GraphQL nesting cap exceeded')
        self.pop('{');out=[]
        while self.peek()!='}':
            name=self.pop()
            if not re.fullmatch(r'[A-Za-z_][A-Za-z_0-9]*',name):raise ValueError('Expected field name')
            alias=name
            if self.peek()==':':self.pop(':');name=self.pop()
            args={}
            if self.peek()=='(':
                self.pop('(')
                while self.peek()!=')':
                    key=self.pop();self.pop(':');v=self.pop()
                    if key in args:raise ValueError('Duplicate argument')
                    if v.startswith('"'):value=json.loads(v)
                    elif re.fullmatch(r'-?\d+',v):value=int(v)
                    elif v in {'true','false'}:value=v=='true'
                    else:raise ValueError('Only scalar literal arguments are supported')
                    args[key]=value
                self.pop(')')
            children=self.selection(depth+1) if self.peek()=='{' else []
            self.nodes+=1
            if self.nodes>120:raise ValueError('Local GraphQL field cap exceeded')
            if any(f[0]==alias for f in out):raise ValueError('Duplicate response name; use distinct aliases')
            out.append((alias,name,args,children))
        self.pop('}');return out
    def parse(self):
        operation='query'
        if self.peek() in {'query','mutation'}:
            operation=self.pop()
            if self.peek()!='{':
                if not re.fullmatch(r'[A-Za-z_][A-Za-z_0-9]*',self.pop()):raise ValueError('Invalid operation name')
        ast=self.selection()
        if self.peek() is not None:raise ValueError('Only one operation per query string is supported')
        return operation,ast

def gql_depth(ast):return max([1+gql_depth(f[3]) for f in ast] or [0])
def gql_cost(ast):return sum(max(1,f[2].get('first',1))*max(1,gql_cost(f[3])) for f in ast)

def graphql(case,fixed,d,state):
    queries=d.get('queries') if case=='graphql-batch' else [string(d,'query')]
    if not isinstance(queries,list) or not 1<=len(queries)<=8 or any(not isinstance(q,str) for q in queries):raise ValueError('Expected one to eight query strings')
    parsed=[GQL(q).parse() for q in queries];errors=[];executed=[];counter=0;verified_total=0;impact=False;invalid=False;status=200
    before={'note':'Original note','bob_revision':0};resource=deepcopy(before)
    def project(obj,fields,private=False):
        nonlocal invalid,impact,counter
        result={}
        for alias,name,args,children in fields:
            if args:raise ValueError('Unknown nested field arguments')
            if name=='recovery_code':
                invalid=True
                if fixed:result[alias]=None;errors.append({'path':alias,'code':'FORBIDDEN'});continue
                impact=True
            if name not in obj and name!='manager':raise ValueError('Unknown selected field: '+name)
            v=obj.get(name)
            if name=='manager':v={'id':'manager','email':'manager@example.test','manager':None}
            if isinstance(v,(dict,list)) and not children:raise ValueError('Object fields require a selection')
            if children and not isinstance(v,(dict,list)):raise ValueError('Scalar fields cannot have a selection')
            result[alias]=[project(item,children) for item in v] if isinstance(v,list) else project(v,children) if isinstance(v,dict) else v
        return result
    outputs=[]
    for operation,ast in parsed:
        if not fixed and case=='graphql-batch':counter=0
        depth=gql_depth(ast);cost=gql_cost(ast)
        if case in {'graphql-depth','graphql-cost'} and (depth>4 or cost>20):
            invalid=True
            if fixed:errors.append({'code':'QUERY_BUDGET_EXCEEDED','depth':depth,'cost':cost});outputs.append(None);continue
            impact=True
        out={}
        for alias,name,args,children in ast:
            if not children:raise ValueError('Object root fields require a selection')
            allowed_args={'node':{'id'},'document':{'id'},'tenant':{'id'},'renameDocument':{'id','title'},'login':{'password'},'documents':{'first'},'updateNote':{'note'}}.get(name,set())
            if set(args)!=allowed_args:raise ValueError('Unsupported or missing field arguments: '+name)
            executed.append({'operation':operation,'field':name,'response_name':alias,'depth':depth,'cost':cost})
            if name=='me':out[alias]=project({'id':'alice','email':'alice@example.test','recovery_code':'DEMO_RECOVERY_ALICE'},children)
            elif name in {'node','document'}:
                ident=args.get('id');obj={'doc-alice':{'id':'doc-alice','owner':'alice','content':'Alice document'},'doc-bob':{'id':'doc-bob','owner':'bob','content':'DEMO_BOB_PRIVATE'}}.get(ident)
                if obj is None:out[alias]=None;continue
                foreign=obj['owner']!='alice';invalid|=foreign
                if fixed and foreign:out[alias]=None;errors.append({'path':alias,'code':'FORBIDDEN'})
                else:out[alias]=project(obj,children);impact|=foreign
            elif name=='tenant':
                ident=args.get('id');foreign=ident!='north';invalid|=foreign
                docs=[{'id':'doc-alice','owner':'alice','content':'Alice document'}] if not foreign else [{'id':'doc-carol','owner':'carol','content':'DEMO_SOUTH_PRIVATE'}]
                if fixed and foreign:out[alias]=None;errors.append({'path':alias,'code':'FORBIDDEN'})
                else:out[alias]=project({'id':ident,'documents':docs},children);impact|=foreign
            elif name=='renameDocument':
                if operation!='mutation':raise ValueError('Mutation field requires mutation operation')
                ident=args.get('id');title=args.get('title')
                if ident not in {'doc-alice','doc-bob'} or not isinstance(title,str):raise ValueError('Invalid document mutation')
                foreign=ident=='doc-bob';invalid|=foreign
                if fixed and foreign:out[alias]=None;errors.append({'path':alias,'code':'FORBIDDEN'})
                else:
                    if foreign:resource['bob_revision']+=1
                    out[alias]=project({'id':ident,'title':title},children);impact|=foreign
            elif name=='login':
                if set(args)!={'password'} or not isinstance(args['password'],str):raise ValueError('Expected login password')
                counter+=1;excess=counter>3;invalid|=excess
                checked=not (fixed and excess);verified_total+=int(checked);impact|=excess and checked
                if not checked:errors.append({'path':alias,'code':'RATE_LIMITED','status':429})
                out[alias]=project({'authenticated':False,'checked':checked,'attempt':counter,'status':401 if checked else 429},children)
            elif name=='documents':
                first=args.get('first',1)
                if type(first) is not int or not 1<=first<=100:raise ValueError('Bounded first: 1..100')
                out[alias]=[project({'id':'doc-'+str(i),'owner':'alice'},children) for i in range(first)]
            elif name=='updateNote':
                if operation!='mutation' or set(args)!={'note'} or not isinstance(args['note'],str):raise ValueError('Invalid note mutation')
                method=string(d,'method') if case=='graphql-csrf' else 'POST';origin=string(d,'origin') if case=='graphql-csrf' else 'https://academy.test'
                bad=method!='POST' or origin!='https://academy.test';invalid|=bad
                if fixed and bad:status=403;out[alias]=None;errors.append({'code':'CROSS_SITE_MUTATION_REJECTED'})
                else:resource['note']=args['note'];out[alias]=project({'note':resource['note']},children);impact|=bad
            elif name=='__schema':out[alias]=project({'queryType':{'fields':[{'name':'adminExport'}]}},children)
            elif name=='adminExport':
                invalid=True
                if fixed:out[alias]=None;errors.append({'path':alias,'code':'FORBIDDEN'})
                else:out[alias]=project({'secret':'DEMO_ADMIN_EXPORT'},children);impact=True
            else:raise ValueError('Unknown root field: '+name)
        outputs.append(out)
    # Alias limits count all fields in an operation, batch limits all operations.
    if case=='graphql-batch' and len(queries)>3:invalid=True;impact|=verified_total>3
    state['resource']=resource
    return answer(status,{'result':outputs if case=='graphql-batch' else outputs[0],'errors':errors,'before':before,'after':resource,'executed_fields':executed,
      'model':'Executable bounded GraphQL subset: named operations, aliases, scalar arguments and field selections; no fragments, variables or external resolvers. HTTP 200 may include field-level errors.'},invalid,fixed,impact,'graphql_policy_rejected')

RESOURCES={'file:///fixtures/secret.txt':'DEMO_XML_SECRET','https://internal.test/profile':'DEMO_INTERNAL_PROFILE',
 'https://dtd.test/entity.dtd':'<!ENTITY sample SYSTEM "file:///fixtures/secret.txt">',
 'https://callback.test/ping':'DEMO_CALLBACK_ACK'}

def xml(case,fixed,d,state):
    source=string(d,'xml',6000);requests=[];budget=12000;invalid=False
    container='xml'
    if case=='xml-docx':
        # Create and reopen a real in-memory ZIP; only the known XML entry is examined.
        buf=BytesIO()
        with ZipFile(buf,'w') as z:z.writestr('word/document.xml',source)
        with ZipFile(BytesIO(buf.getvalue())) as z:source=z.read('word/document.xml').decode()
        container='docx:word/document.xml'
    def resolve(uri):
        if uri not in RESOURCES:raise ValueError('Only listed closed fixture resources are allowed')
        requests.append({'uri':uri,'transport':'closed resource map','content':RESOURCES[uri]})
        return RESOURCES[uri]
    risky=bool(re.search(r'<!DOCTYPE|<!ENTITY|\{http://www.w3.org/2001/XInclude\}|<\w*:include\b',source,re.I))
    invalid=risky
    if fixed and risky:
        return answer(400,{'accepted':False,'text':None,'resource_requests':[],'container':container,'parser_policy':'DTD, entities and XInclude disabled','error':'XML feature disabled before resolution','model':'Closed resolver and bounded XML parser; no host files or external requests.'},True,True,False,'xml_feature_disabled')
    # Resolve only explicit SYSTEM declarations; never delegate resolution to ElementTree.
    expanded=source
    external=re.search(r'<!DOCTYPE\s+\w+\s+SYSTEM\s+[\'"]([^\'"]+)[\'"]\s*>',expanded)
    if external:
        declaration=resolve(external.group(1));expanded=expanded.replace(external.group(0),'<!DOCTYPE root ['+declaration+']>')
    subset=re.search(r'<!DOCTYPE\s+[^\[>]+\[(.*?)\]\s*>',expanded,re.S)
    entities={}
    if subset:
        declarations=subset.group(1)
        for m in re.finditer(r'<!ENTITY\s+%\s+(\w+)\s+SYSTEM\s+[\'"]([^\'"]+)[\'"]\s*>',declarations):
            declarations=declarations.replace('%'+m.group(1)+';',resolve(m.group(2)))
        for m in re.finditer(r'<!ENTITY\s+(\w+)\s+SYSTEM\s+[\'"]([^\'"]+)[\'"]\s*>',declarations):entities[m.group(1)]=resolve(m.group(2))
        for m in re.finditer(r'<!ENTITY\s+(\w+)\s+[\'"]([^\'"]*)[\'"]\s*>',declarations):entities[m.group(1)]=m.group(2)
        expanded=expanded.replace(subset.group(0),'')
    for depth in range(8):
        if not any('&'+k+';' in expanded for k in entities):break
        for key,val in entities.items():
            count=expanded.count('&'+key+';')
            if len(expanded)+count*len(val)>budget:raise ValueError('Local XML expansion safety cap exceeded')
            expanded=expanded.replace('&'+key+';',val)
    try:
        root=ET.fromstring(expanded)
        for parent in list(root.iter()):
            for child in list(parent):
                if child.tag=='{http://www.w3.org/2001/XInclude}include':
                    uri=child.attrib.get('href','');child.clear();child.tag='resolved';child.text=resolve(uri)
        text=''.join(root.itertext())[:4096];error=None
    except ET.ParseError as exc:
        text=None;error=str(exc)[:160]
    exposed=any('SECRET' in r['content'] or 'INTERNAL' in r['content'] for r in requests)
    callback=any(r['uri']=='https://callback.test/ping' for r in requests)
    expansion=case=='xml-expansion' and len(expanded)>1000
    # In the error case the vulnerable wrapper leaks the expanded diagnostic excerpt.
    diagnostic=expanded[:1000] if error and not fixed else None
    if case=='xml-blind':text='Accepted fixture document'
    impact=exposed or callback or expansion
    data={'accepted':error is None,'text':text,'resource_requests':requests,'diagnostic':diagnostic,'parse_error':error,'container':container,
      'expanded_bytes':len(expanded.encode()),'budget':budget,'model':'Closed resolver; actual ElementTree parsing and in-memory ZIP. Expansion capped; not a real network, filesystem or denial-of-service test.'}
    state['last']=deepcopy(data)
    return answer(200 if error is None or case=='xml-error' else 400,data,invalid,fixed,impact,'xml_parse_error')
