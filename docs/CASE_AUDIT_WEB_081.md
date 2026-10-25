# Web 0.8.1 · case-by-case audit

Scope: GitHub Pages web application only. Android release and the Termux repository are unchanged.

## Reproduced defects and changes

- JWT editor rebuilt unchanged segments. Semantically identical JSON with different whitespace changes signed bytes, causing an unexpected signature failure. Unchanged segments now retain their exact original Base64URL bytes. Editing still requires an explicit signature. A separate HS256 button uses only the published training key, so claim-validation exercises can isolate their missing rule.
- Interceptor edits did not update the dedicated JWT/query tools. Both now receive current request values.
- Five redirect lessons accepted only the exact published attack fixture. They now parse learner-supplied URLs using distinct intentionally flawed checks, then contrast against the fixed local-route allowlist. Additional hosts, paths, encodings and nested destinations are tested.
- Redirect rejection responses omitted decision data. Responses now include submitted destination, decision and processing trace in both variants.
- The app browser did not show navigation or protected-profile access. Redirect, JWT, CSRF and CORS now have stateful local page views derived from actual engine results. Redirect changes the virtual address and destination page; rejection stays on the start page. Back is local and submits no request. Changing variants resets the virtual page until resubmission.
- XSS link previews now support explicit local clicks: allowed safe paths show a local destination; blocked links stay on the page. JavaScript links show a clearly labelled simulated click. The opaque iframe and external-network restrictions remain in place.
- Service worker/cache entry points are versioned for installed PWAs. Original green/neutral palette retained.

## Verification and limits

All 108 cases mount their tools and submit the fixed legitimate control in jsdom connected to the real Pyodide engine. All 96 non-XSS cases exercise a legitimate control, vulnerable attack and same-body fixed protection through the editable field interceptor, checking both engine evidence and different rendered results. Extra UI tests cover every redirect, JWT, CSRF and CORS case, signature preservation, custom signed tokens, explicit signing and editor synchronization. Additional parser tests use new redirect destinations absent from the catalog and verify different weak rules.

Real Chrome UI checks cover all 12 XSS cases individually: 11 observed actual alert execution in the weak opaque iframe, no alert during the fixed observation window, and a fixed legitimate control; the URL case checks the actual href policy plus local click events, not JavaScript execution. All 12 reached 3/3 local evidence steps. Browser observations are bounded observations, not proof of all-XSS absence. The browser automation frame locator could not reliably target the opaque URL iframe; its three local link actions were verified with visible coordinate clicks and the iframe's recorded postMessage events.

CSRF/CORS on Pages remain policy simulations. This audit does not claim real cross-origin network exploitation, a running cloud server, all possible inputs, or Android device validation. No real destination URL is fetched by redirect previews.

## Individual case results

`Engine + UI` means control / weak impact / matching fixed protection passed in the browser Python runtime and rendered workspace tests. `Chrome` means those three observations were additionally performed through the real browser UI for XSS. Stateful counters initialize/exhaust their training budgets as required.

| Lab | Case | Verification | Control | Weak attack | Fixed attack |
| --- | --- | --- | --- | --- | --- |
| payment | `pay-price` | Engine + UI | Pass | Pass | Pass |
| payment | `pay-quantity` | Engine + UI | Pass | Pass | Pass |
| payment | `pay-discount` | Engine + UI | Pass | Pass | Pass |
| payment | `pay-coupon-reuse` | Engine + UI | Pass | Pass | Pass |
| payment | `pay-currency` | Engine + UI | Pass | Pass | Pass |
| payment | `pay-rounding` | Engine + UI | Pass | Pass | Pass |
| payment | `pay-total` | Engine + UI | Pass | Pass | Pass |
| payment | `pay-shipping` | Engine + UI | Pass | Pass | Pass |
| payment | `pay-tax` | Engine + UI | Pass | Pass | Pass |
| payment | `pay-status` | Engine + UI | Pass | Pass | Pass |
| payment | `pay-webhook` | Engine + UI | Pass | Pass | Pass |
| payment | `pay-binding` | Engine + UI | Pass | Pass | Pass |
| payment | `pay-replay` | Engine + UI | Pass | Pass | Pass |
| payment | `pay-refund` | Engine + UI | Pass | Pass | Pass |
| payment | `pay-gift` | Engine + UI | Pass | Pass | Pass |
| payment | `pay-trial` | Engine + UI | Pass | Pass | Pass |
| access | `acl-read` | Engine + UI | Pass | Pass | Pass |
| access | `acl-write` | Engine + UI | Pass | Pass | Pass |
| access | `acl-delete` | Engine + UI | Pass | Pass | Pass |
| access | `acl-nested` | Engine + UI | Pass | Pass | Pass |
| access | `acl-tenant` | Engine + UI | Pass | Pass | Pass |
| access | `acl-batch` | Engine + UI | Pass | Pass | Pass |
| access | `acl-export` | Engine + UI | Pass | Pass | Pass |
| access | `acl-download` | Engine + UI | Pass | Pass | Pass |
| access | `acl-role` | Engine + UI | Pass | Pass | Pass |
| access | `acl-mass` | Engine + UI | Pass | Pass | Pass |
| rate | `rate-xff` | Engine + UI | Pass | Pass | Pass |
| rate | `rate-ip-pool` | Engine + UI | Pass | Pass | Pass |
| rate | `rate-ipv6` | Engine + UI | Pass | Pass | Pass |
| rate | `rate-case` | Engine + UI | Pass | Pass | Pass |
| rate | `rate-route` | Engine + UI | Pass | Pass | Pass |
| rate | `rate-reset` | Engine + UI | Pass | Pass | Pass |
| rate | `rate-window` | Engine + UI | Pass | Pass | Pass |
| xss | `xss-html` | Chrome · iframe execution | Pass | Pass | Pass |
| xss | `xss-attr-double` | Chrome · iframe execution | Pass | Pass | Pass |
| xss | `xss-attr-single` | Chrome · iframe execution | Pass | Pass | Pass |
| xss | `xss-attr-bare` | Chrome · iframe execution | Pass | Pass | Pass |
| xss | `xss-script` | Chrome · iframe execution | Pass | Pass | Pass |
| xss | `xss-template` | Chrome · iframe execution | Pass | Pass | Pass |
| xss | `xss-url` | Chrome · URL policy + simulated click | Pass | Pass | Pass |
| xss | `xss-dom-fragment` | Chrome · iframe execution | Pass | Pass | Pass |
| xss | `xss-dom-query` | Chrome · iframe execution | Pass | Pass | Pass |
| xss | `xss-stored` | Chrome · iframe execution | Pass | Pass | Pass |
| xss | `xss-entity` | Chrome · iframe execution | Pass | Pass | Pass |
| xss | `xss-double-url` | Chrome · iframe execution | Pass | Pass | Pass |
| code | `code-sqli` | Engine + UI | Pass | Pass | Pass |
| code | `code-nosql` | Engine + UI | Pass | Pass | Pass |
| code | `code-template` | Engine + UI | Pass | Pass | Pass |
| ssrf | `code-ssrf` | Engine + UI | Pass | Pass | Pass |
| ssrf | `ssrf-loopback` | Engine + UI | Pass | Pass | Pass |
| ssrf | `ssrf-redirect` | Engine + UI | Pass | Pass | Pass |
| ssrf | `ssrf-userinfo` | Engine + UI | Pass | Pass | Pass |
| ssrf | `ssrf-dns` | Engine + UI | Pass | Pass | Pass |
| ssrf | `ssrf-port` | Engine + UI | Pass | Pass | Pass |
| redirect | `code-redirect` | Engine + UI | Pass | Pass | Pass |
| redirect | `redirect-relative` | Engine + UI | Pass | Pass | Pass |
| redirect | `redirect-backslash` | Engine + UI | Pass | Pass | Pass |
| redirect | `redirect-encoded` | Engine + UI | Pass | Pass | Pass |
| redirect | `redirect-suffix` | Engine + UI | Pass | Pass | Pass |
| redirect | `redirect-nested` | Engine + UI | Pass | Pass | Pass |
| csrf | `csrf-missing` | Engine + UI | Pass | Pass | Pass |
| csrf | `csrf-empty` | Engine + UI | Pass | Pass | Pass |
| csrf | `csrf-binding` | Engine + UI | Pass | Pass | Pass |
| csrf | `csrf-origin` | Engine + UI | Pass | Pass | Pass |
| csrf | `csrf-get` | Engine + UI | Pass | Pass | Pass |
| csrf | `csrf-content-type` | Engine + UI | Pass | Pass | Pass |
| cors | `cors-reflect` | Engine + UI | Pass | Pass | Pass |
| cors | `cors-null` | Engine + UI | Pass | Pass | Pass |
| cors | `cors-prefix` | Engine + UI | Pass | Pass | Pass |
| cors | `cors-suffix` | Engine + UI | Pass | Pass | Pass |
| cors | `cors-scheme` | Engine + UI | Pass | Pass | Pass |
| cors | `cors-preflight` | Engine + UI | Pass | Pass | Pass |
| upload | `upload-extension` | Engine + UI | Pass | Pass | Pass |
| upload | `upload-double` | Engine + UI | Pass | Pass | Pass |
| upload | `upload-mime` | Engine + UI | Pass | Pass | Pass |
| upload | `upload-path` | Engine + UI | Pass | Pass | Pass |
| upload | `upload-overwrite` | Engine + UI | Pass | Pass | Pass |
| upload | `upload-svg` | Engine + UI | Pass | Pass | Pass |
| traversal | `traversal-relative` | Engine + UI | Pass | Pass | Pass |
| traversal | `traversal-encoded` | Engine + UI | Pass | Pass | Pass |
| traversal | `traversal-double` | Engine + UI | Pass | Pass | Pass |
| traversal | `traversal-backslash` | Engine + UI | Pass | Pass | Pass |
| traversal | `traversal-absolute` | Engine + UI | Pass | Pass | Pass |
| traversal | `traversal-prefix` | Engine + UI | Pass | Pass | Pass |
| disclosure | `disclosure-env` | Engine + UI | Pass | Pass | Pass |
| disclosure | `disclosure-git` | Engine + UI | Pass | Pass | Pass |
| disclosure | `disclosure-backup` | Engine + UI | Pass | Pass | Pass |
| disclosure | `disclosure-listing` | Engine + UI | Pass | Pass | Pass |
| disclosure | `disclosure-trace` | Engine + UI | Pass | Pass | Pass |
| disclosure | `disclosure-apikey` | Engine + UI | Pass | Pass | Pass |
| authentication | `authentication-reset-binding` | Engine + UI | Pass | Pass | Pass |
| authentication | `authentication-reset-replay` | Engine + UI | Pass | Pass | Pass |
| authentication | `authentication-reset-expiry` | Engine + UI | Pass | Pass | Pass |
| authentication | `authentication-logout` | Engine + UI | Pass | Pass | Pass |
| authentication | `authentication-mfa` | Engine + UI | Pass | Pass | Pass |
| authentication | `authentication-purpose` | Engine + UI | Pass | Pass | Pass |
| jwt | `jwt-none` | Engine + UI | Pass | Pass | Pass |
| jwt | `jwt-signature` | Engine + UI | Pass | Pass | Pass |
| jwt | `jwt-expiry` | Engine + UI | Pass | Pass | Pass |
| jwt | `jwt-audience` | Engine + UI | Pass | Pass | Pass |
| jwt | `jwt-issuer` | Engine + UI | Pass | Pass | Pass |
| jwt | `jwt-purpose` | Engine + UI | Pass | Pass | Pass |
| assignment | `assignment-role` | Engine + UI | Pass | Pass | Pass |
| assignment | `assignment-verified` | Engine + UI | Pass | Pass | Pass |
| assignment | `assignment-balance` | Engine + UI | Pass | Pass | Pass |
| assignment | `assignment-tenant` | Engine + UI | Pass | Pass | Pass |
| assignment | `assignment-owner` | Engine + UI | Pass | Pass | Pass |
| assignment | `assignment-nested` | Engine + UI | Pass | Pass | Pass |
