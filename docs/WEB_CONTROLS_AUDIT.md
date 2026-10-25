# Web controls audit — 0.5

The audit reproduced two UI regressions before fixing them: expanded mode could hide the catalog after returning home, and New round restored the previous draft rather than a fresh control request. Both are now executable regression tests.

Other corrections: navigation and boundary states remain available in expanded mode; domain action labels follow each case; resource selectors use document/batch/child/job/file contracts; upload presets match each case; guide/expand controls remain available during execution; stale results are marked after interceptor edits; failed requests leave the loading state; encoding applies only to compatible text fields and JWT decoding is not offered outside JWT lessons.

## Validation

- 108 cases: mount tabs, verify unique persistent controls, submit a fresh fixed control through the service UI.
- 96 non-XSS cases: enter the supplied impact input using field types/inclusion, observe weak impact, replay the same input against the fix, and complete evidence with a legitimate fixed control.
- All 12 XSS cases manually exercised in the actual Chrome sandbox for matching weak/fixed/control observations. The URL case verifies the URL policy, rather than claiming an automatically followed javascript URL.
- Regression tests also cover expanded/home lifecycle, new-round state and retained notes, per-case picker boundaries, resource selectors, upload presets, pending edits, guide availability while busy, codec applicability, HTTP/history comparison and blank numeric validation.
- Existing engine/cache and Python account/content/HTTP suites remain in place.

UI regression tests use pinned jsdom as a development-only dependency and the same original Python engines in Pyodide. jsdom does not execute preview iframe payloads; those require real-browser verification. No VM, external lab server, native Android source change or Termux repository change is claimed.
