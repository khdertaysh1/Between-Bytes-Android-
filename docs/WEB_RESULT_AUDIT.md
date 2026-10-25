# Web result audit — v0.6

## Corrected behavior

- Fixed null resources, error responses and empty result lists remain visible inside the application viewport. The previous contextual renderer could hide them entirely.
- The viewport renders the actual HTTP response body. This matters for already-paid orders: a rejected request can preserve paid state while adding no new transaction or entitlement.
- Variant switching clears the current result and asks for a new submission. It never represents an old result as a response from the other variant.
- The explicit replay control sends the same current JSON body to the other variant. Comparison cards show actual submissions; each variant has independent persistent state. Matching JSON bodies do not imply identical request headers or starting state.
- XSS observations update the visible application verdict using actual sandbox events. A missing alert is bounded observation, and the URL case reports URL policy rather than claiming navigation.
- Browser shell includes lab address, current variant, home and an explicit resend control. Results precede editing controls; mobile comparison cards stack vertically.

## Verification

The jsdom UI tests run the actual controllers with the original Python/WASM engine. All 108 cases mount their tools and submit legitimate fixed controls. The 96 non-XSS cases additionally submit typed attack input to both variants, require weak impact and fixed protection, and assert that the rendered response content differs (excluding variant/verdict labels). They also verify waiting state on switching and paired response availability.

All 12 XSS cases were separately exercised through the live Chrome controls: weak browser evidence, the same input against the fix, and legitimate fixed control. jsdom does not execute iframe payloads. Responsive browser checks at 375 and 965 CSS pixels showed no horizontal document overflow, including paired results on the narrow viewport.

The table lists the matching attack results from the same independent-engine sequence: fresh fixed control; rate-budget initialization where needed; weak attack; fixed attack. XSS rows use browser observations. This covers the supplied fixtures, not every possible input or device.

| Case | Weak | Fixed | Verification |
| --- | --- | --- | --- |
| pay-price | HTTP 200 · impact | HTTP 422 · protected | UI content + engine |
| pay-quantity | HTTP 200 · impact | HTTP 422 · protected | UI content + engine |
| pay-discount | HTTP 200 · impact | HTTP 422 · protected | UI content + engine |
| pay-coupon-reuse | HTTP 200 · impact | HTTP 409 · protected | UI content + engine |
| pay-currency | HTTP 200 · impact | HTTP 409 · protected | UI content + engine |
| pay-rounding | HTTP 200 · impact | HTTP 422 · protected | UI content + engine |
| pay-total | HTTP 200 · impact | HTTP 422 · protected | UI content + engine |
| pay-shipping | HTTP 200 · impact | HTTP 422 · protected | UI content + engine |
| pay-tax | HTTP 200 · impact | HTTP 422 · protected | UI content + engine |
| pay-status | HTTP 200 · impact | HTTP 409 · protected | UI content + engine |
| pay-webhook | HTTP 200 · impact | HTTP 401 · protected | UI content + engine |
| pay-binding | HTTP 200 · impact | HTTP 409 · protected | UI content + engine |
| pay-replay | HTTP 200 · impact | HTTP 200 · protected | UI content + engine |
| pay-refund | HTTP 200 · impact | HTTP 409 · protected | UI content + engine |
| pay-gift | HTTP 200 · impact | HTTP 409 · protected | UI content + engine |
| pay-trial | HTTP 200 · impact | HTTP 409 · protected | UI content + engine |
| acl-read | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| acl-write | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| acl-delete | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| acl-nested | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| acl-tenant | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| acl-batch | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| acl-export | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| acl-download | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| acl-role | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| acl-mass | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| rate-xff | HTTP 401 · impact | HTTP 429 · protected | UI content + engine |
| rate-ip-pool | HTTP 429 · impact | HTTP 429 · protected | UI content + engine |
| rate-ipv6 | HTTP 401 · impact | HTTP 429 · protected | UI content + engine |
| rate-case | HTTP 401 · impact | HTTP 429 · protected | UI content + engine |
| rate-route | HTTP 401 · impact | HTTP 429 · protected | UI content + engine |
| rate-reset | HTTP 401 · impact | HTTP 429 · protected | UI content + engine |
| rate-window | HTTP 401 · impact | HTTP 429 · protected | UI content + engine |
| xss-html | Sandbox execution observed | No alert observed in window | Chrome + legitimate control |
| xss-attr-double | Sandbox execution observed | No alert observed in window | Chrome + legitimate control |
| xss-attr-single | Sandbox execution observed | No alert observed in window | Chrome + legitimate control |
| xss-attr-bare | Sandbox execution observed | No alert observed in window | Chrome + legitimate control |
| xss-script | Sandbox execution observed | No alert observed in window | Chrome + legitimate control |
| xss-template | Sandbox execution observed | No alert observed in window | Chrome + legitimate control |
| xss-url | JavaScript URL allowed | JavaScript URL blocked | Chrome + legitimate control |
| xss-dom-fragment | Sandbox execution observed | No alert observed in window | Chrome + legitimate control |
| xss-dom-query | Sandbox execution observed | No alert observed in window | Chrome + legitimate control |
| xss-stored | Sandbox execution observed | No alert observed in window | Chrome + legitimate control |
| xss-entity | Sandbox execution observed | No alert observed in window | Chrome + legitimate control |
| xss-double-url | Sandbox execution observed | No alert observed in window | Chrome + legitimate control |
| code-sqli | HTTP 200 · impact | HTTP 200 · protected | UI content + engine |
| code-nosql | HTTP 200 · impact | HTTP 422 · protected | UI content + engine |
| code-template | HTTP 200 · impact | HTTP 200 · protected | UI content + engine |
| code-ssrf | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| ssrf-loopback | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| ssrf-redirect | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| ssrf-userinfo | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| ssrf-dns | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| ssrf-port | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| code-redirect | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| redirect-relative | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| redirect-backslash | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| redirect-encoded | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| redirect-suffix | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| redirect-nested | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| csrf-missing | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| csrf-empty | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| csrf-binding | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| csrf-origin | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| csrf-get | HTTP 200 · impact | HTTP 405 · protected | UI content + engine |
| csrf-content-type | HTTP 200 · impact | HTTP 415 · protected | UI content + engine |
| cors-reflect | HTTP 200 · impact | HTTP 200 · protected | UI content + engine |
| cors-null | HTTP 200 · impact | HTTP 200 · protected | UI content + engine |
| cors-prefix | HTTP 200 · impact | HTTP 200 · protected | UI content + engine |
| cors-suffix | HTTP 200 · impact | HTTP 200 · protected | UI content + engine |
| cors-scheme | HTTP 200 · impact | HTTP 200 · protected | UI content + engine |
| cors-preflight | HTTP 200 · impact | HTTP 200 · protected | UI content + engine |
| upload-extension | HTTP 201 · impact | HTTP 415 · protected | UI content + engine |
| upload-double | HTTP 201 · impact | HTTP 415 · protected | UI content + engine |
| upload-mime | HTTP 201 · impact | HTTP 415 · protected | UI content + engine |
| upload-path | HTTP 201 · impact | HTTP 403 · protected | UI content + engine |
| upload-overwrite | HTTP 201 · impact | HTTP 403 · protected | UI content + engine |
| upload-svg | HTTP 201 · impact | HTTP 415 · protected | UI content + engine |
| traversal-relative | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| traversal-encoded | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| traversal-double | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| traversal-backslash | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| traversal-absolute | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| traversal-prefix | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| disclosure-env | HTTP 200 · impact | HTTP 404 · protected | UI content + engine |
| disclosure-git | HTTP 200 · impact | HTTP 404 · protected | UI content + engine |
| disclosure-backup | HTTP 200 · impact | HTTP 404 · protected | UI content + engine |
| disclosure-listing | HTTP 200 · impact | HTTP 404 · protected | UI content + engine |
| disclosure-trace | HTTP 200 · impact | HTTP 404 · protected | UI content + engine |
| disclosure-apikey | HTTP 200 · impact | HTTP 200 · protected | UI content + engine |
| authentication-reset-binding | HTTP 200 · impact | HTTP 401 · protected | UI content + engine |
| authentication-reset-replay | HTTP 200 · impact | HTTP 401 · protected | UI content + engine |
| authentication-reset-expiry | HTTP 200 · impact | HTTP 401 · protected | UI content + engine |
| authentication-logout | HTTP 200 · impact | HTTP 401 · protected | UI content + engine |
| authentication-mfa | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| authentication-purpose | HTTP 200 · impact | HTTP 401 · protected | UI content + engine |
| jwt-none | HTTP 200 · impact | HTTP 401 · protected | UI content + engine |
| jwt-signature | HTTP 200 · impact | HTTP 401 · protected | UI content + engine |
| jwt-expiry | HTTP 200 · impact | HTTP 401 · protected | UI content + engine |
| jwt-audience | HTTP 200 · impact | HTTP 401 · protected | UI content + engine |
| jwt-issuer | HTTP 200 · impact | HTTP 401 · protected | UI content + engine |
| jwt-purpose | HTTP 200 · impact | HTTP 401 · protected | UI content + engine |
| assignment-role | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| assignment-verified | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| assignment-balance | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| assignment-tenant | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| assignment-owner | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
| assignment-nested | HTTP 200 · impact | HTTP 403 · protected | UI content + engine |
