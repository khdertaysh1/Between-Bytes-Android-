Between Bytes Academy 0.2.0 — hands-on practice restored.

- The original Web Labs workspace and all 96 cases are bundled: editable fields, virtual HTTP editor, request history/replay/comparison, codecs, business readback and evidence export.
- Runs the original Python engines and real in-memory SQLite inside a dedicated Web Worker. Runtime files are included in the APK, without a CDN or Termux dependency.
- XSS previews use isolated sandbox frames; CSRF/CORS/SSRF transport remains explicitly modeled, with no external transport.
- Native lesson/progress screens are retained. All practical rooms are immediately open.
- Local-study website is built for GitHub Pages, without a ChatGPT account requirement.

Debug-signed testing build, Android 8+. Requires a sufficiently current Android System WebView to execute the bundled WebAssembly runtime. Replacing 0.1 may require removing the earlier debug-signed package; uninstalling clears its local progress.
