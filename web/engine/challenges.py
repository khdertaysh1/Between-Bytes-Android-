"""Independent self-study exercises. Virtual resources only; no host IO or network.

Evidence requires observed impact, protection for identical JSON and a legitimate
fixed control. This local evidence ledger is not a tamper-resistant grading service.
"""
from copy import deepcopy
import json
import posixpath

CATALOG = [
    {'id': 'checkout-authority', 'title': {'ar': 'طلب واحد وحدّان للثقة', 'en': 'One order, two trust boundaries'},
     'task': {'ar': 'جرّب طلب شراء سليم للدورة، ثم حقّق هل يمكن تغيير السعر أو مالك الطلب من بيانات العميل. أثبت الأثر، واختبر نفس المدخل بعد الإصلاح، وتأكد أن الاستخدام السليم يعمل.',
              'en': 'Place a legitimate course order, then investigate whether client data can change its price or owner. Prove impact, replay identical input against the repair and preserve legitimate use.'},
     'resources': {'ar': 'الفاعل alice. COURSE-START سعره 12000 سنت؛ KIT-NET سعره 4500 سنت. حساب bob مستخدم آخر. لا توجد دفعات حقيقية.',
                   'en': 'Actor: alice. COURSE-START costs 12000 cents; KIT-NET costs 4500 cents. bob is another user. No real payments.'},
     'normal': {'sku': 'COURSE-START', 'quantity': 1, 'unit_price': 12000, 'owner': 'alice'},
     'bad': 'order.owner = body["owner"]\norder.total = body["unit_price"] * body["quantity"]',
     'fixed': 'require(body["owner"] == session.user)\nrequire(body["unit_price"] == catalog[body["sku"]])\norder.total = catalog[body["sku"]] * quantity',
     'repair': {'ar': 'هوية الجلسة وكتالوج الخادم يحددان مالك الطلب وسعره. ارفض التعارض قبل تغيير الحالة.',
                'en': 'Session identity and the server catalog determine order ownership and price. Reject conflicts before mutation.'}},
    {'id': 'profile-policy', 'title': {'ar': 'تعديل ملف شخصي بحدود واضحة', 'en': 'A profile update with clear boundaries'},
     'task': {'ar': 'تحديث اسم العرض والمنطقة الزمنية عملية مسموحة. حقّق هل يمكن أن يغيّر نفس الطلب الدور أو المؤسسة. اجمع دليلاً على الفرق بين النسختين مع طلب سليم بعد الإصلاح.',
              'en': 'Display-name and time-zone updates are allowed. Investigate whether the same request can change role or tenant. Collect evidence across variants plus a legitimate fixed control.'},
     'resources': {'ar': 'الجلسة alice ضمن north ودورها student. بيانات المؤسسات north وsouth تدريبية. المنطقة الزمنية نص محدود وليست خدمة وقت.',
                   'en': 'Session: alice in north, role student. north and south are fixture tenants. Time zone is bounded text, not a time service.'},
     'normal': {'display_name': 'Alice Student', 'timezone': 'UTC', 'role': 'student', 'tenant': 'north'},
     'bad': 'profile.update(body)',
     'fixed': 'require(body["role"] == session.role)\nrequire(body["tenant"] == session.tenant)\nprofile.update(display_name=body["display_name"], timezone=body["timezone"])',
     'repair': {'ar': 'اسم العرض والمنطقة الزمنية قابلان للتعديل. الدور والمؤسسة من الجلسة ولا يقررهما العميل؛ ارفض المخالفة قبل التحديث.',
                'en': 'Display name and time zone are editable. Role and tenant belong to the session; reject conflicts before updating.'}},
    {'id': 'document-boundary', 'title': {'ar': 'عنوان ملف وهوية لا تثق بهما', 'en': 'An untrusted path and identity'},
     'task': {'ar': 'افتح المستند العام ثم حقّق في العلاقة بين توحيد المسار والتحقق من المؤسسة وهوية الجلسة. أثبت قراءة غير مسموحة إن وجدت، ثم اختبر نفس الطلب بعد الإصلاح.',
              'en': 'Open the public document, then investigate path normalization, tenant authorization and session identity. Prove unauthorized reading if possible, then replay against the repair.'},
     'resources': {'ar': 'alice ضمن north، وbob ضمن south. الموارد الوهمية: /public/notes.txt و/teams/north/internal.txt و/teams/south/internal.txt. لا يقرأ المحرك ملفات الجهاز.',
                   'en': 'alice belongs to north; bob to south. Virtual files: /public/notes.txt, /teams/north/internal.txt, /teams/south/internal.txt. No host files are read.'},
     'normal': {'path': '/public/notes.txt', 'as_user': 'alice'},
     'bad': 'allow = raw_path.startswith("/public/") or file.tenant == users[body["as_user"]].tenant\nreturn virtual_files[normalize(raw_path)] if allow else deny()',
     'fixed': 'path = normalize(body["path"])\nallow = file_at(path).public or file_at(path).tenant == session.tenant\nreturn file_at(path) if allow else deny()',
     'repair': {'ar': 'وحّد المسار أولاً ثم افحص المورد الفعلي بهوية الجلسة الثابتة. بادئة النص وهوية يرسلها العميل لا تمنحان الإذن.',
                'en': 'Normalize first, then authorize the resolved resource against the fixed session. Raw prefixes and client-supplied identities cannot grant access.'}},
]
CASES = {row['id']: row for row in CATALOG}
FILES = {'/public/notes.txt': {'tenant': None, 'content': 'DEMO_PUBLIC_NOTES'},
         '/teams/north/internal.txt': {'tenant': 'north', 'content': 'DEMO_NORTH_DOCUMENT'},
         '/teams/south/internal.txt': {'tenant': 'south', 'content': 'DEMO_SOUTH_PRIVATE_DOCUMENT'}}


def bounded(value, name, maximum=80):
    if not isinstance(value, str) or not 1 <= len(value) <= maximum or any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise ValueError('Expected bounded text: ' + name)
    return value


class Challenges:
    def __init__(self):
        self.states = {}
        self.observations = {}

    def reset(self, case):
        if case not in CASES:
            raise ValueError('Unknown challenge')
        self.states.pop(case, None)
        self.observations.pop(case, None)

    def state(self, case, mode):
        seed = {'checkout-authority': {'owner': 'alice', 'sku': 'COURSE-START', 'quantity': 1, 'total': 12000, 'revision': 0},
                'profile-policy': {'display_name': 'Alice', 'timezone': 'UTC', 'role': 'student', 'tenant': 'north', 'revision': 0},
                'document-boundary': {'reads': 0}}
        return self.states.setdefault(case, {}).setdefault(mode, deepcopy(seed[case]))

    def evidence(self, case):
        ledger = self.observations.get(case, {'impact': set(), 'protected': set(), 'control': False})
        matching = bool(ledger['impact'] & ledger['protected'])
        checks = {'weak_impact': bool(ledger['impact']), 'matching_fixed_protection': matching, 'fixed_control': ledger['control']}
        return {'checks': checks, 'complete': all(checks.values()), 'scope': 'local self-study; session-only observations, not certified grades'}

    def run(self, case, mode, body):
        if case not in CASES or mode not in {'fixed', 'vulnerable'}:
            raise ValueError('Unknown challenge or variant')
        if not isinstance(body, dict) or set(body) != set(CASES[case]['normal']):
            raise ValueError('Use exactly the fields from the control request')
        fixed = mode == 'fixed'
        # Validate before creating or mutating an exercise state.
        if case == 'checkout-authority':
            prices = {'COURSE-START': 12000, 'KIT-NET': 4500}
            if body['sku'] not in prices or body['owner'] not in {'alice', 'bob'}:
                raise ValueError('Unknown SKU or fixture account')
            if type(body['quantity']) is not int or not 1 <= body['quantity'] <= 5 or type(body['unit_price']) is not int or not 0 <= body['unit_price'] <= 1000000:
                raise ValueError('Use quantity 1..5 and integer unit_price 0..1000000')
            invalid = body['owner'] != 'alice' or body['unit_price'] != prices[body['sku']]
        elif case == 'profile-policy':
            for key in ('display_name', 'timezone', 'role', 'tenant'):
                bounded(body[key], key)
            if body['role'] not in {'student', 'admin'} or body['tenant'] not in {'north', 'south'}:
                raise ValueError('Unknown role or tenant fixture')
            invalid = body['role'] != 'student' or body['tenant'] != 'north'
        else:
            raw = bounded(body['path'], 'path', 256)
            if body['as_user'] not in {'alice', 'bob'}:
                raise ValueError('Unknown fixture user')
            path = posixpath.normpath(raw.replace('\\', '/'))
            if not path.startswith('/'):
                raise ValueError('Use an absolute virtual path')
            file = FILES.get(path)
            invalid = bool(file and file['tenant'] not in {None, 'north'})
        state = self.state(case, mode)
        before = deepcopy(state)
        status, impact, protected, legitimate = 200, False, False, False
        if case == 'checkout-authority':
            if fixed and invalid:
                status, protected = 422, True
            else:
                state.update(owner='alice' if fixed else body['owner'], sku=body['sku'], quantity=body['quantity'],
                             total=(prices[body['sku']] if fixed else body['unit_price']) * body['quantity'], revision=state['revision'] + 1)
                impact, legitimate = invalid and not fixed, fixed and not invalid
            data = {'accepted': status == 200, 'order': deepcopy(state)}
        elif case == 'profile-policy':
            if fixed and invalid:
                status, protected = 403, True
            else:
                state.update(display_name=body['display_name'], timezone=body['timezone'],
                             role='student' if fixed else body['role'], tenant='north' if fixed else body['tenant'], revision=state['revision'] + 1)
                impact, legitimate = invalid and not fixed, fixed and not invalid
            data = {'accepted': status == 200, 'profile': deepcopy(state)}
        else:
            allowed = bool(file) and (file['tenant'] in {None, 'north'} if fixed else raw.startswith('/public/') or file['tenant'] in {None, {'alice': 'north', 'bob': 'south'}[body['as_user']]})
            status = 404 if not file else 200 if allowed else 403
            if allowed:
                state['reads'] += 1
            impact, protected, legitimate = invalid and allowed and not fixed, invalid and not allowed and fixed, bool(file) and not invalid and allowed and fixed
            data = {'resolved_path': path, 'readable': allowed, 'content': file['content'] if allowed else None}
        ledger = self.observations.setdefault(case, {'impact': set(), 'protected': set(), 'control': False})
        identity = json.dumps(body, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
        if impact:
            ledger['impact'].add(identity)
        if protected:
            ledger['protected'].add(identity)
        if legitimate:
            ledger['control'] = True
        # Bound the evidence ledger; students can restart a challenge for a fresh round.
        if len(ledger['impact']) > 64:
            ledger['impact'] = {identity} if impact else set()
        if len(ledger['protected']) > 64:
            ledger['protected'] = {identity} if protected else set()
        return status, {'data': data, 'impact': impact, 'protected': protected, 'legitimate': legitimate,
                        'before': before, 'after': deepcopy(state), 'evidence': self.evidence(case)}


challenges = Challenges()
