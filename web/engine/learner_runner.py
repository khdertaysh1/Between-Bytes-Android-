"""Learner scratch execution in a dedicated disposable worker, without lab engine state."""
import sys,json,io,contextlib,traceback

def run_student(raw):
 data=json.loads(raw);source=data['source'];request=data['request'];events=[];truncated=False
 if len(source)>16000:raise ValueError('Code is limited to 16000 characters')
 class Output(io.StringIO):
  def write(self,value):
   if self.tell()<16000:super().write(value[:16000-self.tell()])
   return len(value)
 out=Output();scope={'request':request,'__name__':'__learner__'}
 def observe(frame,event,arg):
  nonlocal truncated
  if frame.f_code.co_filename!='<learner>' or event not in {'line','return','exception'}:return observe
  if len(events)>=160:truncated=True;return observe
  values={key:repr(value)[:400] for key,value in frame.f_locals.items() if not key.startswith('_') and isinstance(value,(str,int,float,bool,type(None),dict,list,tuple))}
  events.append({'line':frame.f_lineno,'event':event,'function':frame.f_code.co_name,'values':dict(list(values.items())[:8])})
  return observe
 previous=sys.gettrace();error=None
 try:
  code=compile(source,'<learner>','exec')
  with contextlib.redirect_stdout(out),contextlib.redirect_stderr(out):
   sys.settrace(observe);exec(code,scope)
 except BaseException as exc:error={'type':type(exc).__name__,'message':str(exc)[:500],'line':getattr(exc,'lineno',None)}
 finally:sys.settrace(previous)
 result=scope.get('request');valid=isinstance(result,dict)
 if valid:
  try:json.dumps(result,allow_nan=False)
  except (ValueError,TypeError):valid=False
 return json.dumps({'output':out.getvalue(),'request':result if valid else None,'valid':valid,'error':error,'trace':events,'truncated':truncated},ensure_ascii=False)
