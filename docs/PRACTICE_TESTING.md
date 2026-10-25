# Verification scope

`npm run test:wasm` executes the original Python code in the same Pyodide runtime bundled into the website/APK. It verifies 96 non-XSS cases for a legitimate fixed control, a vulnerable impact, the matching fixed protection and a completed evidence flag. Additional checks cover virtual HTTP routes, validation, persistent checkout readback, request IDs and bounded XSS HTML/CSP generation.

`PracticeSmokeTest` runs on an Android emulator via GitHub Actions. It launches the bundled WebView workspace, loads the module Worker and Wasm from Android assets, sends a one-cent quote to both variants, verifies 200/422 and the correct amount, then observes the sandboxed XSS alert event. A passing desktop WebAssembly test alone is not a substitute for this Android test. The APK Release depends on this smoke test.

The existing 16 account/content/HTTP tests continue to run. The original repository is left unchanged; its full server/browser/dual-origin suites have not been run against this static port. The port does not implement the original second HTTP origin for live CSRF/CORS browser sessions and labels those exercises as policy models. It does not claim external network transport or a remote production backend.


0.3.0 adds six signed-token contract lessons and six stateful profile-field lessons.
All 96 non-XSS cases run in WASM for fixed control, weak impact, identical-input fixed protection and evidence completion. JWT edge tests cover malformed and multiple-invalid-rule tokens; profile tests verify rejected changes do not mutate state and reject invalid nested types. Three service-worker tests exercise cache-first runtime loading, persisted downloads and offline navigation/missing assets. Android instrumentation additionally executes all 12 new cases through the bundled Worker and verifies actual response bodies, plus the original checkout and sandboxed XSS smoke.

Performance scope: cache-first avoids a network round-trip for already-cached scripts/WASM; card content visibility defers off-screen rendering. No device-wide benchmark or universal speed multiplier is claimed. Drafts survive navigation/reload; live engine state and evidence remain session-scoped.
