# Navigation workspace pilot

Entry point: `web/navigation-lab.html`. A link appears on the academy overview and in the six original redirect rooms. Original engines and completion marks remain separate. This is a focused prototype to review before extending the workspace to other vulnerability classes.

## What executes

The editable JavaScript function produces the actual response object used by the pilot. It receives a parsed GET request and a `trace(label, values)` callback. Six starter handlers demonstrate distinct validation boundaries: unchecked destination, leading slash, backslash normalization, decode order, host-prefix checks and nested redirects. `URL` is the browser's actual WHATWG parser.

HTTP text, status lines and displayed navigation are local models, not a real proxy or network redirect. The preview is rendered HTML with a working form, classroom and outside-destination screen. No request goes to the displayed destination. The reference repair allows the exact origin and final account/welcome paths; it is deliberately a narrow policy for this application, not a universal URL sanitizer.

The code runner lives in an opaque sandboxed iframe. Its CSP denies network connections and remote scripts; it creates a disposable blob Worker with inherited CSP, executes the function, and terminates it on completion or after two seconds. The app preview has a separate sandbox and restrictive CSP. It permits form events so its submit handler can intercept them, while CSP denies actual form navigation. No same-origin permission, popup or top-navigation permission is granted. Arbitrary code can still exhaust worker memory or alter its own exercise results: this is a browser-local educational scratchpad, not a trusted assessment service or server sandbox.

Trace steps are explicit callback events, not automatic instrumentation of every source line. The viewer retains the source belonging to each response. Repair tests are twelve bounded examples per case, not exhaustive proof. Async response functions are unsupported.

## Validation

- Nine Node tests cover all six weak/control/fixed paths and 72 repair-vector evaluations, different parser boundaries, wire encoding, invalid methods/hosts/response shapes and forbidden navigation schemes.
- Existing 41 workspace/Pyodide/cache tests passed after adding the entry points and cache assets.
- Chrome manual/UI automation exercised each case: legitimate control -> external bypass -> 12/12 reference repair -> blocked bypass with 403 and login retained.
- Chrome verified the app form intercept, following a 302 manually when auto-follow is off, response comparison, stepping trace values, two-second termination of an infinite loop and execution recovery. A synchronous cross-origin XHR from student code was blocked.
- During QA, the preview form initially did not dispatch submit because `allow-forms` was missing. The preview sandbox was corrected while retaining CSP `form-action 'none'`.
- Layout uses responsive single-column/mobile breakpoints and a full-window browser toggle. Physical Android validation remains for user review.

## References

- https://portswigger.net/burp/documentation/desktop/tools/repeater
- https://portswigger.net/burp/documentation/desktop/tools/repeater/http-messages
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe

Interaction patterns are independently implemented; no third-party UI code or branding is copied. The site's existing green/neutral palette is reused.

### Guided explanation update

The pilot now includes an expanded Arabic lesson and a five-step practical walkthrough, with distinct explanations for all six validation mistakes. The active source indicator distinguishes weak, reference-fixed, and edited code (including restored drafts and history selections). The reference button explicitly activates the fixed source for the next run.

Execution flow is built from each recorded attempt's trace events, in execution order, with clickable steps, Arabic explanations, and a response outcome. Encoded cases also record the extra decoding step, so the weak and fixed order can be compared. This remains explicit instrumentation, not a general JavaScript debugger.

The local browser now focuses on `next`, the actual destination origin/path, the expected origin, and the fixture policy. Decorative course progress has been removed. No external destination is contacted.

### Application pages across all labs (web 0.10)

All 108 cases retain their original engines and task-specific tools, and now mount a service-shaped application with home, detail, operation and result pages. Browser back/forward and refresh are view actions; they do not resubmit payments, uploads, account changes or rate-limit attempts. An explicit operation/interceptor submission is required to call the engine. Variant changes and failed submissions clear the current result so old data cannot be mistaken for a fresh response. The comparison tool retains clearly labelled historical submissions separately from the application's current page.

The app remains visible alongside the selected inspector on wide screens and stacks above it on narrow screens. Result pages render actual returned documents, order state, search results, files, account data or policy decisions. XSS keeps its original opaque sandbox frame and observation messages. CSRF, CORS, SSRF and redirect transport remain local models; these page transitions do not create a production backend or a two-origin proof.

Every case has an expanded scenario, cause, five practical steps, interpretation and repair principle. Source views show teaching snippets plus the actual bundled engine source. The Python learner editor transforms the request; it is explicitly separate from editing server logic. Recorded function paths and line explanations are based on interpreter events; line snapshots precede execution. Arabic mode labels are “تحتوي على مشكلة” and “بعد الإصلاح”; internal `vulnerable`/`fixed` API identifiers remain stable.

The standalone JavaScript redirect workshop now includes academy, course, sign-in, account, settings and help pages, with functional local links and back/forward history. Only submitting its sign-in form or sending the HTTP request executes the editable redirect handler.

Audit corrections: fixed redirect policy no longer runs or reports the weak validation branch; origin classification now distinguishes protocol changes and normalizes default ports. The original Termux repository and production Cloudflare settings are unchanged.
