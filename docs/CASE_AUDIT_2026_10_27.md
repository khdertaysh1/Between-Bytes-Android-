# Academy case audit — 2026-10-27

Base: `35a6adae70a306a9da836f1d4228c66a4a366ebe`. Scope: the existing GitHub Pages academy; no hosting migration or additional server labs.

## Reproduced defect

The fixed `authentication-mfa` route accepted `session-active`, a generic session without a completed second factor. The vulnerable route rejected the same session, so selecting the repaired variant unexpectedly increased access. The fix requires `mfa-complete` specifically for this lesson, returns HTTP 403 for an active session without MFA, and retains ordinary active-session acceptance in the logout lesson. A regression test checks seven credential fixtures in both variants and the logout control.

The service-worker cache advances to `web-v0.12.1` so returning online visitors receive the corrected Python engine. Existing completion marks and notes are not cleared.

## Verification

- All 108 cases mounted and submitted their normal fixed control through jsdom using the actual Pyodide engine.
- All 96 non-XSS cases submitted the attack through the typed field interceptor in both variants, with matching-input protection, completion evidence and distinct rendered responses.
- All 108 application navigation flows were exercised without executing an operation on back/forward/refresh.
- An additional field-type sweep made 4,176 requests across all 108 cases and both variants. It includes null, booleans, integers, fractional numbers, arrays, objects, empty and oversized strings. Each request resets its case. Every response stayed below HTTP 500; no fixed variant reported impact.
- Live Chrome on the published academy exercised all 12 XSS cases: fixed normal control, weak attack, identical fixed attack. Eleven observed actual alert execution in the weak opaque frame and no alert during the fixed observation window; the URL case observed the actual href policy (`/welcome`, JavaScript URL, `#blocked`), rather than executing that JavaScript URL. Every XSS case reached 3/3 evidence steps.

## Limits

This is fixture and boundary-input coverage, not proof of correctness for every possible input. jsdom does not verify pixel layout. This run does not claim an Android device or a mobile viewport visual check. The live Chrome XSS run exercised the current published build; the MFA fix was checked in local Pyodide and UI tests before opening the PR. CSRF/CORS remain labelled policy simulations, and file/network examples retain virtual resources. No new cloud lab was deployed and no Android APK was released.

## Per-case matrix

| Lab | Case | Fixed control | Weak attack | Same-input fixed attack | Extra type requests | Verification |
| --- | --- | --- | --- | --- | ---: | --- |
| payment | pay-price | HTTP 200 | HTTP 200 · impact | HTTP 422 · protected | 24 | Pyodide + UI |
| payment | pay-quantity | HTTP 200 | HTTP 200 · impact | HTTP 422 · protected | 24 | Pyodide + UI |
| payment | pay-discount | HTTP 200 | HTTP 200 · impact | HTTP 422 · protected | 24 | Pyodide + UI |
| payment | pay-coupon-reuse | HTTP 200 | HTTP 200 · impact | HTTP 409 · protected | 48 | Pyodide + UI |
| payment | pay-currency | HTTP 200 | HTTP 200 · impact | HTTP 409 · protected | 24 | Pyodide + UI |
| payment | pay-rounding | HTTP 200 | HTTP 200 · impact | HTTP 422 · protected | 24 | Pyodide + UI |
| payment | pay-total | HTTP 200 | HTTP 200 · impact | HTTP 422 · protected | 24 | Pyodide + UI |
| payment | pay-shipping | HTTP 200 | HTTP 200 · impact | HTTP 422 · protected | 24 | Pyodide + UI |
| payment | pay-tax | HTTP 200 | HTTP 200 · impact | HTTP 422 · protected | 24 | Pyodide + UI |
| payment | pay-status | HTTP 200 | HTTP 200 · impact | HTTP 409 · protected | 48 | Pyodide + UI |
| payment | pay-webhook | HTTP 200 | HTTP 200 · impact | HTTP 401 · protected | 48 | Pyodide + UI |
| payment | pay-binding | HTTP 200 | HTTP 200 · impact | HTTP 409 · protected | 24 | Pyodide + UI |
| payment | pay-replay | HTTP 200 | HTTP 200 · impact | HTTP 200 · protected | 48 | Pyodide + UI |
| payment | pay-refund | HTTP 200 | HTTP 200 · impact | HTTP 409 · protected | 24 | Pyodide + UI |
| payment | pay-gift | HTTP 200 | HTTP 200 · impact | HTTP 409 · protected | 48 | Pyodide + UI |
| payment | pay-trial | HTTP 200 | HTTP 200 · impact | HTTP 409 · protected | 48 | Pyodide + UI |
| access | acl-read | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| access | acl-write | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 48 | Pyodide + UI |
| access | acl-delete | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| access | acl-nested | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 48 | Pyodide + UI |
| access | acl-tenant | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 48 | Pyodide + UI |
| access | acl-batch | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| access | acl-export | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| access | acl-download | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| access | acl-role | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 48 | Pyodide + UI |
| access | acl-mass | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| rate | rate-xff | HTTP 429 | HTTP 401 · impact | HTTP 429 · protected | 72 | Pyodide + UI |
| rate | rate-ip-pool | HTTP 429 | HTTP 429 · impact | HTTP 429 · protected | 72 | Pyodide + UI |
| rate | rate-ipv6 | HTTP 429 | HTTP 401 · impact | HTTP 429 · protected | 72 | Pyodide + UI |
| rate | rate-case | HTTP 429 | HTTP 401 · impact | HTTP 429 · protected | 48 | Pyodide + UI |
| rate | rate-route | HTTP 429 | HTTP 401 · impact | HTTP 429 · protected | 72 | Pyodide + UI |
| rate | rate-reset | HTTP 429 | HTTP 401 · impact | HTTP 429 · protected | 72 | Pyodide + UI |
| rate | rate-window | HTTP 401 | HTTP 401 · impact | HTTP 429 · protected | 48 | Pyodide + UI |
| xss | xss-html | rendered | alert observed | no alert in observation window | 24 | Live Chrome + UI mount |
| xss | xss-attr-double | rendered | alert observed | no alert in observation window | 24 | Live Chrome + UI mount |
| xss | xss-attr-single | rendered | alert observed | no alert in observation window | 24 | Live Chrome + UI mount |
| xss | xss-attr-bare | rendered | alert observed | no alert in observation window | 24 | Live Chrome + UI mount |
| xss | xss-script | rendered | alert observed | no alert in observation window | 24 | Live Chrome + UI mount |
| xss | xss-template | rendered | alert observed | no alert in observation window | 24 | Live Chrome + UI mount |
| xss | xss-url | rendered | JavaScript URL allowed | URL blocked | 24 | Live Chrome + UI mount |
| xss | xss-dom-fragment | rendered | alert observed | no alert in observation window | 24 | Live Chrome + UI mount |
| xss | xss-dom-query | rendered | alert observed | no alert in observation window | 24 | Live Chrome + UI mount |
| xss | xss-stored | rendered | alert observed | no alert in observation window | 24 | Live Chrome + UI mount |
| xss | xss-entity | rendered | alert observed | no alert in observation window | 24 | Live Chrome + UI mount |
| xss | xss-double-url | rendered | alert observed | no alert in observation window | 24 | Live Chrome + UI mount |
| code | code-sqli | HTTP 200 | HTTP 200 · impact | HTTP 200 · protected | 24 | Pyodide + UI |
| code | code-nosql | HTTP 200 | HTTP 200 · impact | HTTP 422 · protected | 24 | Pyodide + UI |
| code | code-template | HTTP 200 | HTTP 200 · impact | HTTP 200 · protected | 24 | Pyodide + UI |
| ssrf | code-ssrf | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| ssrf | ssrf-loopback | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| ssrf | ssrf-redirect | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| ssrf | ssrf-userinfo | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| ssrf | ssrf-dns | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| ssrf | ssrf-port | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| redirect | code-redirect | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| redirect | redirect-relative | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| redirect | redirect-backslash | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| redirect | redirect-encoded | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| redirect | redirect-suffix | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| redirect | redirect-nested | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| csrf | csrf-missing | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 120 | Pyodide + UI |
| csrf | csrf-empty | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 120 | Pyodide + UI |
| csrf | csrf-binding | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 120 | Pyodide + UI |
| csrf | csrf-origin | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 120 | Pyodide + UI |
| csrf | csrf-get | HTTP 200 | HTTP 200 · impact | HTTP 405 · protected | 120 | Pyodide + UI |
| csrf | csrf-content-type | HTTP 200 | HTTP 200 · impact | HTTP 415 · protected | 120 | Pyodide + UI |
| cors | cors-reflect | HTTP 200 | HTTP 200 · impact | HTTP 200 · protected | 48 | Pyodide + UI |
| cors | cors-null | HTTP 200 | HTTP 200 · impact | HTTP 200 · protected | 48 | Pyodide + UI |
| cors | cors-prefix | HTTP 200 | HTTP 200 · impact | HTTP 200 · protected | 48 | Pyodide + UI |
| cors | cors-suffix | HTTP 200 | HTTP 200 · impact | HTTP 200 · protected | 48 | Pyodide + UI |
| cors | cors-scheme | HTTP 200 | HTTP 200 · impact | HTTP 200 · protected | 48 | Pyodide + UI |
| cors | cors-preflight | HTTP 200 | HTTP 200 · impact | HTTP 200 · protected | 48 | Pyodide + UI |
| upload | upload-extension | HTTP 201 | HTTP 201 · impact | HTTP 415 · protected | 72 | Pyodide + UI |
| upload | upload-double | HTTP 201 | HTTP 201 · impact | HTTP 415 · protected | 72 | Pyodide + UI |
| upload | upload-mime | HTTP 201 | HTTP 201 · impact | HTTP 415 · protected | 72 | Pyodide + UI |
| upload | upload-path | HTTP 201 | HTTP 201 · impact | HTTP 403 · protected | 72 | Pyodide + UI |
| upload | upload-overwrite | HTTP 201 | HTTP 201 · impact | HTTP 403 · protected | 72 | Pyodide + UI |
| upload | upload-svg | HTTP 201 | HTTP 201 · impact | HTTP 415 · protected | 72 | Pyodide + UI |
| traversal | traversal-relative | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| traversal | traversal-encoded | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| traversal | traversal-double | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| traversal | traversal-backslash | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| traversal | traversal-absolute | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| traversal | traversal-prefix | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| disclosure | disclosure-env | HTTP 200 | HTTP 200 · impact | HTTP 404 · protected | 24 | Pyodide + UI |
| disclosure | disclosure-git | HTTP 200 | HTTP 200 · impact | HTTP 404 · protected | 24 | Pyodide + UI |
| disclosure | disclosure-backup | HTTP 200 | HTTP 200 · impact | HTTP 404 · protected | 24 | Pyodide + UI |
| disclosure | disclosure-listing | HTTP 200 | HTTP 200 · impact | HTTP 404 · protected | 24 | Pyodide + UI |
| disclosure | disclosure-trace | HTTP 200 | HTTP 200 · impact | HTTP 404 · protected | 24 | Pyodide + UI |
| disclosure | disclosure-apikey | HTTP 200 | HTTP 200 · impact | HTTP 200 · protected | 24 | Pyodide + UI |
| authentication | authentication-reset-binding | HTTP 200 | HTTP 200 · impact | HTTP 401 · protected | 72 | Pyodide + UI |
| authentication | authentication-reset-replay | HTTP 200 | HTTP 200 · impact | HTTP 401 · protected | 24 | Pyodide + UI |
| authentication | authentication-reset-expiry | HTTP 200 | HTTP 200 · impact | HTTP 401 · protected | 24 | Pyodide + UI |
| authentication | authentication-logout | HTTP 200 | HTTP 200 · impact | HTTP 401 · protected | 24 | Pyodide + UI |
| authentication | authentication-mfa | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| authentication | authentication-purpose | HTTP 200 | HTTP 200 · impact | HTTP 401 · protected | 24 | Pyodide + UI |
| jwt | jwt-none | HTTP 200 | HTTP 200 · impact | HTTP 401 · protected | 24 | Pyodide + UI |
| jwt | jwt-signature | HTTP 200 | HTTP 200 · impact | HTTP 401 · protected | 24 | Pyodide + UI |
| jwt | jwt-expiry | HTTP 200 | HTTP 200 · impact | HTTP 401 · protected | 24 | Pyodide + UI |
| jwt | jwt-audience | HTTP 200 | HTTP 200 · impact | HTTP 401 · protected | 24 | Pyodide + UI |
| jwt | jwt-issuer | HTTP 200 | HTTP 200 · impact | HTTP 401 · protected | 24 | Pyodide + UI |
| jwt | jwt-purpose | HTTP 200 | HTTP 200 · impact | HTTP 401 · protected | 24 | Pyodide + UI |
| assignment | assignment-role | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| assignment | assignment-verified | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| assignment | assignment-balance | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| assignment | assignment-tenant | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| assignment | assignment-owner | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
| assignment | assignment-nested | HTTP 200 | HTTP 200 · impact | HTTP 403 · protected | 24 | Pyodide + UI |
