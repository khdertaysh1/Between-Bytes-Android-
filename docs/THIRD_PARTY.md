# Engine provenance and runtime

The practical UI and five Python engine modules were copied from the user's MIT-licensed Between-Bytes-Web-Labs at commit c396c90f2e7ed080f71368ce9edb5cd630098b09. `web/engine/LICENSE` preserves the complete copyright and permission notice. The original project is unchanged.

https://github.com/khdertaysh1/Between-Bytes-Web-Labs/tree/c396c90f2e7ed080f71368ce9edb5cd630098b09

The transport adapter moves the same engine to a dedicated Web Worker using Pyodide 314.0.7. The runtime is fetched from the official `pyodide` npm package using package-lock integrity verification, copied without modification, and served from this project's own host or Android assets. It is not loaded from a CDN during use. Pyodide is licensed under MPL-2.0; source, licensing and dependency notices are available at:

https://github.com/pyodide/pyodide
https://github.com/pyodide/pyodide/blob/314.0.7/LICENSE
https://github.com/pyodide/pyodide/tree/314.0.7

No real payment processor, DNS, outbound SSRF target, account email, upload execution or external navigation is used. Business routes are a virtual HTTP transport into the original stateful engine. SQLite queries execute against synthetic in-memory tables. XSS previews execute in opaque sandboxed iframes with network/form/navigation restrictions. The static build does not reproduce the original two-port CSRF/CORS server: those are explicitly local policy models here. The browser URL source in DOM-XSS previews is fed from the edited fixture URL into the same sink, rather than navigating to an HTTP preview endpoint.
