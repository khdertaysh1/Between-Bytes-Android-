# Code and flow workspace — web v0.7

The source/trace surface is optional inside every lab; the initial surface is selected by the task profile (browser, request workbench, terminal, query worksheet, JWT editor or origin model). The old v0.1 learning dashboard is removed; its URL redirects to the current labs. No engine status banner is mounted at the top of the page.

## Optional code and source inspection

1. Read the case-specific vulnerable/fixed teaching snippets and the trust-boundary explanation.
2. Write real Python against `request`, use conditions/functions/print, run it, and inspect line events and local values.
3. Explicitly apply the resulting JSON object or send it to the current lab variant. Code execution alone never sends a lab request.
4. Inspect the submitted request, actual Python interpreter events, the exact engine file and highlighted line, local values, and actual HTTP response.
5. Step backward/forward or select a recorded service event; change variants and submit the same code-produced request again. XSS browser events are recorded separately from service interpreter events.

The learner runner lives in a separate disposable Worker; it does not load the lab engine or its state. Startup is bounded to 60 seconds and execution to 8 seconds, with a manual Stop control. Completed workers are terminated to release memory. Output is capped at 16,000 characters and learner traces at 160 events. The service trace is optional and capped at 180 events; truncation is shown. Values are bounded repr snapshots. Line events occur before execution of the line; return events occur after the return. The highlighted engine source is fetched from the same deployed source files, not generated from a generic vulnerability diagram. The snippets above it remain explicitly labelled teaching snippets.

The worker separation is a local execution boundary for responsiveness and state separation, not a hardened general-purpose Python hosting service. Do not treat this static learning app as a server-side code sandbox.

## Reliability changes

Startup failures now terminate the failed engine Worker and leave loading state. Retrying starts a new Worker; late messages from the old Worker are ignored. Friendly setup/error status is scoped to the execution workspace and disappears after readiness. The old progress string is never left as a global page banner.

## Validation

- All 108 cases mount the new learning/code/source controls and submit their fixed controls; the 96 non-XSS cases also reproduce weak impact, fixed protection and different rendered response data with service tracing enabled.
- The complete learner-Python → explicit apply/send → actual engine/trace flow is an executable UI regression test.
- Tests cover Python branches, line values, output and trace bounds, syntax/runtime errors, invalid result objects, engine source-line references, startup failure/retry, and removal of legacy navigation/banner.
- All 12 XSS cases were re-exercised in Chrome through the Python editor: code execution, weak request/browser evidence, matching fixed request, and legitimate fixed control. Service traces contained 109 events per supplied XSS case, and 110 for the stored case. URL XSS checks URL policy rather than claiming external navigation.
- Chrome also verified price manipulation through real learner Python followed by fixed rejection, division-by-zero rejection, and automatic termination of an infinite loop while the interface stayed usable.
- Mobile check at 375 CSS pixels covered editing/running/sending Python and stepping through actual commerce source without horizontal document overflow.

These checks cover the shipped cases and explicit error paths, not every possible program, payload, browser or device.
