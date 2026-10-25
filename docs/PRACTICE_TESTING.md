# Verification scope

`npm run test:wasm` executes the original Python code in the same Pyodide runtime bundled into the website/APK. It verifies 84 non-XSS cases for a legitimate fixed control, a vulnerable impact, the matching fixed protection and a completed evidence flag. Additional checks cover virtual HTTP routes, validation, persistent checkout readback, request IDs and bounded XSS HTML/CSP generation.

`PracticeSmokeTest` runs on an Android emulator via GitHub Actions. It launches the bundled WebView workspace, loads the module Worker and Wasm from Android assets, sends a one-cent quote to both variants, verifies 200/422 and the correct amount, then observes the sandboxed XSS alert event. A passing desktop WebAssembly test alone is not a substitute for this Android test. The APK Release depends on this smoke test.

The existing 16 account/content/HTTP tests continue to run. The original repository is left unchanged; its full server/browser/dual-origin suites have not been run against this static port. The port does not implement the original second HTTP origin for live CSRF/CORS browser sessions and labels those exercises as policy models. It does not claim external network transport or a remote production backend.
