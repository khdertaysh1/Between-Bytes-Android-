# Web 0.14.0 — student introduction and continuity

Students entering the academy previously saw the entire lab catalog without a guided first exercise. The home page now offers a bilingual five-stage path spanning all 15 groups and 108 cases, with prerequisites, suggested time per case, completion counts and the next unfinished case. The path recommends an order; it does not lock existing labs or shorten their explanations.

## First exercise

`web/welcome.html` runs the original local Python payment engine through `BBEngine`. The student explicitly selects the variant, edits JSON, and submits. Each attempt reads the resource independently after the POST and displays both responses. Advancing requires the expected execution result and saved amount:

1. Fixed control: `price=10000`, HTTP 200, saved amount 10000 cents.
2. Vulnerable price change: `price=1`, HTTP 200, saved amount 1 cent.
3. Identical input against the fix: HTTP 422, saved amount remains 10000 cents.

Wrong variants, malformed inputs, input edits after success, and failed resource reads do not award the step. Running or opening the page does not submit automatically. The exercise does not mark the full lab complete, and it describes quote tampering without claiming payment settlement. Its engine state belongs to that page's Worker, separate from a full-lab page. Restart resets this case and the introduction's step state.

## Continuing study

- Hints progress from the case invariant, to relevant fields and comparison strategy, to a worked body and its repair. The first two do not reveal a worked body. Revealing a hint never edits or sends the current request. Existing explicit example-loading controls remain available.
- Home-page backups contain completion marks, notes and JSON drafts only. They do not contain account tokens, passwords, the runtime database, Python editor code, request history or source-trace history. Notes and draft inputs can include student-entered sensitive text; the UI tells students to keep their backup private. Exports are capped at 1 MiB and validate known case IDs and bounded values.
- File selection validates and previews the proposed import without changing storage. A separate merge action writes only guest marks and device notes/drafts; existing values win conflicts. Account marks are not replaced and imports are not uploaded. A signed-in learner must sign out to view guest marks. Existing explicit account guest-import behavior is preserved.
- A storage failure shows a warning. In-memory drafts and notes are retained for export, including after navigating back home. Failed restoration attempts roll earlier writes back; storage is best effort if the browser itself refuses rollback writes. This is not a durable server backup.
- Catalog loading has a visible failure state and explicit retry. Case links open the feedback form with the case ID and version visible for review, without automatically attaching requests, credentials or notes. Submission still requires the student's explicit action.
- Each case states whether it is a local Python exercise or a bounded policy model. The separate server browser and its API are preserved.
- The service worker precaches the introduction and new assets, with a new namespace and versioned changed scripts. Returning visitors retain existing progress keys.

## Verification and release limits

The added tests exercise the introduction with the actual Pyodide engine and rendered controllers, including wrong variants, malformed JSON, edits invalidating success, a failed readback and restarting. Backup checks cover round trips, account-key isolation, oversized/malformed data, unknown cases, invalid modes, prototype-shaped keys and rollback on a storage failure. Rendered academy tests cover catalog retry, hint routing and backup recovery when storage is full. Existing all-case field-interceptor, comparison, navigation, engine, service, account and offline-cache tests remain enabled. The new introduction's assets are checked by the offline reference suite.

Commands:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run prepare:practice
npm run test:wasm
npm run test:services
npm run test:navigation
python -m unittest discover -s tests -v
```

Local verification uses jsdom and the actual Pyodide runtime, not a rendering browser. A Playwright Chromium installation was attempted, but its download returned invalid archives. No fresh browser screenshots, physical Android touch test, public account test or live deployment of these changes is claimed. Before broad student release, visually check the new pages and backup file picker on an actual Android phone and verify the public service configuration.

This change does not add email verification/password recovery, instructor grading, new independent challenge scenarios, certificates or additional external-server labs. These remain follow-up work. The existing account service, server checkout and full lab explanations are not replaced. GitHub Pages publishes only after the change is merged and the existing deployment succeeds; opening a PR does not update the public site.
