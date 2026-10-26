# Direct feedback and private Academy dashboard

## What is implemented

The GitHub Pages web frontend can send anonymous feedback to an independently deployed Cloudflare Worker and D1 database. Students do not need GitHub accounts. Optional email is sent only with the submitted message. The public form shows a receipt only after a matching server response. Retry IDs prevent duplicate messages. When the service is unconfigured or unreachable, the UI says so and preserves the text; the existing GitHub issue channel remains a clearly labelled public fallback.

The private dashboard is served on the Worker's own `/admin/` origin. Its APIs require a server-side session. Sessions use random 256-bit tokens, stored hashed in D1, expire after eight hours, and use Secure/HttpOnly/SameSite=Strict cookies in production. Admin mutations require the Worker's own Origin. No keys are included in public assets, localStorage, URLs, or GitHub source. Authentication and feedback intake have database-enforced limits; a honeypot and strict origin/schema/body validation supplement those limits. These controls do not claim to eliminate all spam or automate identity verification.

The dashboard supports feedback search, status filters, pagination, internal notes and status changes (new / reviewing / resolved), plus date-range statistics for page views, measured tab sessions, lab attempts, client-reported completions, active time, devices, referrer hostnames, approximate countries and Damascus activity hours. Daily buckets use UTC and are labelled accordingly. Feedback contents are rendered with textContent, not HTML.

## Measurement definition

Analytics are opt-in and default off. The collector sends only allowlisted metadata: event UUID, random per-tab session ID, case ID, event kind, variant, HTTP status and bounded active seconds; plus coarse device and referrer hostname. It does not send learner code, payloads, request bodies, JWTs, report notes or form field contents. Cloudflare may supply approximate country; raw IP addresses are not stored in the application database. Short-lived abuse counters store salted hashes of network source labels.

SPA navigation has an explicit view hook. Attempts are reported after an actual engine response; completion is the local engine/browser evidence result, not a verified certificate. One completion per case/session is enforced in D1. Page visibility and recent interaction bound active time. The server additionally caps credited seconds by elapsed wall time for that session. Hidden and idle pages are excluded approximately. Batch event UUIDs make retries idempotent, and withdrawal clears unsent events. Browser blockers, denied consent, closed tabs and offline sessions cause undercounting; sessions are not unique people. Statistics start at activation, with no historical reconstruction. No analytics records are fabricated for presentation.

A daily job deletes expired admin sessions/rate counters and analytics older than 90 days by default (`RETENTION_DAYS`, bounded 7–365). Feedback is retained separately for management. The privacy page explains these behaviors and permits withdrawing consent.

## Local verification

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run prepare:practice
npm run test:services
npm run test:wasm
npm run dev
```

`npm run dev` serves a disposable Miniflare/D1 service and the web app. Preview data is synthetic and disappears on restart. For UI QA only, the dev server's `/__local_preview/admin` creates a local test session without asking for production credentials. This route is NOT present in the production Worker, and dev assets clearly identify the local preview. Production cookies always remain Secure; the deliberately separate local cookie is accepted only with `LOCAL_DEV=true` on an explicit loopback/preview hostname. Do not deploy the Node dev server publicly.

`tests/services_worker.test.mjs` executes the actual Worker against Miniflare D1, covering anonymous intake, idempotency/conflicts, validation and body limits, origin/CORS rules, database rate limits, fail-closed unconfigured/unauthenticated access, cookies/logout/expiry, inbox filters/updates, real aggregation, metadata minimization and active-time caps. UI tests cover receipts/failures/retries, missing configuration, consent/revocation, hidden time and previous-case attribution, stable event IDs and safe feedback rendering. Existing 108-case lab regression tests are retained.

## Cloud activation (account access required)

No provider account or production credentials are bundled. A `.com` domain is not required. The public web stays on GitHub Pages; only intake, storage and admin live on the Worker.

1. In the owner's Cloudflare account, create a D1 database named `between-bytes-academy`. Retain its database UUID and the account ID. Choose the Worker name `between-bytes-academy-api` and its available workers.dev origin (the account-specific hostname cannot be guessed).
2. Configure a Cloudflare API token for that account with Workers Scripts Edit and D1 Edit needed by the deployment. Keep the token in GitHub Actions **Secrets**, never in chat or repository files. The owner must authorize credential creation/provider login through the secure account flow.
3. In repository Settings → Secrets and variables → Actions, set:

| Type | Name | Value |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | Restricted provider deployment token |
| Secret | `ACADEMY_ADMIN_KEY` | Independently generated random admin key, at least 32 characters |
| Secret | `ACADEMY_RATE_SALT` | A different random key, at least 32 characters |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | Owner account ID |
| Variable | `ACADEMY_D1_DATABASE_ID` | D1 UUID |
| Variable | `ACADEMY_SERVICE_URL` | Actual HTTPS Worker origin only, no path or credentials |

4. Run **Deploy private Academy feedback and analytics service**. The checked-in workflow runs service tests, applies versioned migrations, bundles/deploys the Worker and admin assets, uploads secrets through stdin, then verifies configured health. Placeholder database IDs are deliberately unusable; do not call the service active until deployment passes.
5. Run **Publish Academy Web on GitHub Pages**. It verifies service readiness before generating the public connection file. That file contains the HTTPS origin only. Updated service configuration refreshes from the network with an offline fallback. With no `ACADEMY_SERVICE_URL`, direct intake stays explicitly unavailable.
6. Verify anonymous submission from the real Pages origin, read it in `/admin/`, change its status, then verify opt-in visits/attempts. Test logout, unauthorized access and opt-out. Provider-account activation and this cross-origin production verification have not occurred merely because local tests pass.

Admin key rotation uses the secret deployment flow; existing sessions expire within eight hours. Keep a secure copy in a password manager. Cloudflare free quotas still apply; the deployment does not enable paid billing or promise unlimited operation. Mail delivery, push notifications, student cloud accounts, and arbitrary Linux lab instances are outside this change.

## Primary provider references

- D1 bindings: https://developers.cloudflare.com/d1/worker-api/
- D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- Workers configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
- Free-plan limits: https://developers.cloudflare.com/workers/platform/limits/
