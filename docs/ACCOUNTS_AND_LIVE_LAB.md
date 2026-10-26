# Optional accounts and live price laboratory (Web 0.11)

The GitHub Pages academy remains fully usable without an account. Email/password accounts synchronize completed case IDs only; notes, payloads and editor drafts remain local. Progress is learner-reported, not an exam credential. Guest marks are imported only through an explicit button, and signed-in marks use a separate local key per account.

## Service deployment

The existing Cloudflare Worker uses `services/academy-api/wrangler.jsonc`. Deploy the same tested commit as the web release. `0002_accounts_and_live_lab.sql` adds tables without dropping existing feedback. The new route module also performs idempotent additive schema initialization to support the existing Git-connected deployment command, which does not run the migrations CLI. Standard deployment can still run `wrangler d1 migrations apply DB --remote` first.

Production `/health` advertises `version: "0.11"` and `capabilities.accounts` / `capabilities.live_checkout` after the new Worker has deployed. Old Workers do not support these routes. Public client configuration remains API origin only; never add admin keys or salts to web assets.

## Authentication

- Server-side PBKDF2-HMAC-SHA256, 100,000 iterations (workerd's per-call limit), random 256-bit account salt, preceded by HMAC with the server's `RATE_LIMIT_SALT` as pepper. This platform-constrained work factor is below the standalone OWASP PBKDF2 recommendation; retain the pepper outside D1 and enforce the implemented IP/account throttles.
- IMPORTANT: this deployment's `RATE_LIMIT_SALT` now also protects password verifiers. Preserve it across deployments. Changing it requires a planned credential migration/reset; do not rotate it as a disposable rate-limit value once accounts exist. A future independent AUTH_PEPPER migration can decouple these lifecycles.
- Passwords: 12–128 characters, never stored plaintext or logged. Email normalized to lowercase. No email provider has been connected: email ownership verification and email password recovery are explicitly unavailable in the UI.
- 256-bit opaque bearer sessions; SHA-256 token digests only in D1; seven-day server expiry; revoke on logout. The browser retains its token only in sessionStorage, so it works without third-party cookies and closing the tab ends local retention. Sandbox training content cannot access the academy origin. Do not add unsandboxed untrusted HTML to the account shell.
- HTTPS production transport, allowlisted CORS, bounded JSON bodies, per-network and per-account login limits. Account creation currently discloses an unavailable email through its conflict response; do not represent this as enumeration-resistant authentication.
- Progress reads/writes derive identity from the authenticated server session, never a supplied user ID. Logout and guest browsing stay separate. Sync batches at most 25 marks per SQL statement to stay below the D1 Free query/parameter limits, including full 108-case accounts. Sync merges additions; explicit per-case removal deletes only that account's mark. Existing feedback/admin authentication is unchanged.

## Real server pilot

`web/live-lab.html` calls `/v1/live/*` on the Worker. An anonymous two-hour random session scopes D1 order rows. This is actual HTTP and persistent SQL execution; it does not call the browser Python engine.

Only the price-trust case is intentionally exposed. The weak route trusts `unit_minor`; the repaired route uses the server's 10000-cent catalog price. Both validate SKU, integer quantity (1–10), input bounds and modes. Unique `(session_hash, mode, request_id)` prevents duplicate orders, including concurrent retries. Reuse with different effective business input returns 409. Modes have separate order keys. There is no real payment, arbitrary code execution, outbound fetch, upload, account privilege or paid entitlement in this pilot.

GET reads and view navigation never repeat POST operations. Request IDs remain available for explicit replay; generating a new ID means a new operation. Scheduled cleanup removes expired anonymous sessions and their rows, and expired learner session tokens. Accounts/progress persist until a separately implemented account lifecycle action; email recovery/deletion UI is not included in this release.

## Verification

`npm run test:services` covers password checks, session hashing/revocation/expiry, CORS, account isolation, progress validation/import separation, anonymous lab isolation, price repair, and retry idempotence. `npm run test:wasm` retains the complete 108-case local workflow tests. Browser QA also checks real HTTP price results and page navigation. No production learner account or real financial operation is created by the test suite.
