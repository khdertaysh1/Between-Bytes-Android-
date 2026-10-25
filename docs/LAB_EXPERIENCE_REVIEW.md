# Lab experience review and tool-specific workspaces

Reviewed 2026-10-26. The goal is task → appropriate tool → observable evidence → interpretation → repair, rather than making all vulnerabilities use the same Python form.

## Primary sources reviewed

| Source | Observed teaching pattern | Application here |
| --- | --- | --- |
| [PortSwigger Academy getting started](https://portswigger.net/web-security/getting-started) | Topics, interactive labs and request interception/replay tooling | App actions, captured requests, editable HTTP and paired responses for access/payment/API tasks |
| [WebGoat goals](https://github.com/OWASP/www-project-webgoat/blob/master/tab_goals.md) | Explain vulnerability, learn through assignments, explain mitigation | Case-specific task brief, local evidence, optional source/trace and fix discussion |
| [Juice Shop learning](https://juice-shop.github.io/tab_learning.html) | Guided challenges and separate Find It/Fix It coding challenges | Code/source is an optional inspection surface; it is not the mandatory entry point for every case |
| [HTB Academy modules](https://help.hackthebox.com/en/articles/12741910-academy-modules-paths) | Focused sections, target/workstation exercises, assessment and notes | Each case declares its tool profile and evidence goal; preserved notes and reset semantics |
| [TryHackMe AttackBox](https://help.tryhackme.com/en/articles/6721845-the-attackbox-explained) | Browser-accessible cloud workstation alongside tasks | A bounded local HTTP workstation where appropriate; explicitly not a fake general-purpose Linux VM |

No proprietary exercises, screenshots or branding were copied.

## Task-specific surfaces

| Cases | Entry tool | What the learner changes / observes |
| --- | --- | --- |
| XSS contexts | App browser, then DOM inspector | Sink input, actual isolated-frame source, rendered DOM and browser events |
| SQL injection | SQL worksheet | Search input, constructed vulnerable query or bound parameters, actual SQLite rows |
| NoSQL | JSON operator worksheet | String versus operator-object password values and authentication result |
| Template injection | Template worksheet | Closed expression/template input and evaluated output; no claim of a general remote template server |
| Access control | Document app and request inspector | Session actor versus resource owner; read/update/delete/batch/export behavior |
| Payment | Checkout and ledger | Quote/receipt/refund/replay/gift/trial operations with transaction and entitlement evidence |
| JWT | Header/claims/signature editor | Token components and actual verification-rule results; editing never silently re-signs |
| Traversal/disclosure/SSRF/rate | Local HTTP command station | Typed curl-style requests, actual engine responses, virtual request/response/source files; no external network |
| Upload | Media form/storage inspection | Filename, media type/content and stored-file owner; acceptance is not execution |
| Authentication/mass assignment | Account/API request tools | Token/session binding and before/after protected field state |
| CSRF/CORS | Policy inspection or optional two-origin server | Separate local-model evidence from actual browser cookie/origin behavior |

The source/trace/Python scratch workspace remains available for deeper investigation. It is not the default for all labs.

## Cloud evaluation

- [Cloudflare Workers](https://developers.cloudflare.com/workers/platform/pricing/): Free currently includes 100,000 requests/day and 10ms CPU per invocation. This is suitable for small APIs, not a replacement for an unrestricted multi-user Linux lab host. [D1](https://developers.cloudflare.com/d1/platform/pricing/) has bounded free query/storage quotas. No Cloudflare account or paid deployment was created.
- [GitHub Codespaces](https://docs.github.com/billing/managing-billing-for-github-codespaces/about-billing-for-github-codespaces): GitHub Free personal accounts currently include 120 core-hours and 15 GB-month, not permanent public hosting. The repository includes an optional private devcontainer and two-origin Python server.
- [Private forwarded ports](https://docs.github.com/en/codespaces/reference/security-in-github-codespaces) use GitHub authentication cookies. Cloud proxy, cookie and browser restrictions can affect cross-origin behavior. Private ports must remain private, and browser behavior must be validated in the actual environment; opening a cloud configuration is not proof that it is running.

The private server exposes only synthetic researcher/victim accounts and bounded learner-authored pages. It serves the same web app and adds `/studio/` browser endpoints, not the production account API. Its reusable browser session implementation was adapted from the user's MIT-licensed original project with its license retained. The separate Termux repository was not changed.

## Visual contract

Use the original dark-green/neutral palette consistently across the catalog, app browser, workstations and source inspector. Status colors retain their meaning. Do not introduce a new accent scheme for another tool or update unless the user requests it.

## Validation limits

The final local run passed 53 automated tests (34 Node/WASM/UI/parser/cache tests and 19 Python/API/private-server tests). Mobile browser checks at 375 CSS pixels covered SQL execution, terminal layout and JWT component layout without horizontal document overflow.

- UI/WASM tests cover every shipped case and task-profile selection, plus dedicated tool-control tests for SQL/JSON/template, all JWT cases, and all terminal-profile cases.
- The terminal parser is tested against every normal/attack fixture, quoting/apostrophes, unsupported flags and outside-host rejection.
- Browser QA exercises actual SQL, terminal and JWT workflows and real XSS DOM inspection.
- Private-server HTTP tests cover session isolation, actual account state changes/rejections, CORS headers and the separate-origin document response/CSP. Browser-based cross-origin cloud behavior is not claimed as verified: this QA environment exposes one preview origin and rejects the second port.
- Prior actual Chrome tests of all 12 XSS contexts through the code runner remain documented in CODE_FLOW_WORKSPACE.md. The engine/sandbox is unchanged by the tool-profile switch.
