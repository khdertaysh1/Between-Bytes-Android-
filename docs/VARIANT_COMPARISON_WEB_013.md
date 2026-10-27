# Web 0.13 — page, HTTP and validation comparison

The two variants share the application and legitimate workflow. Their results must differ when the executed logic produces a different resource, mutation, authorization decision or browser observation. Selecting a mode alone must never fabricate a result.

## Changes

- Once the same JSON body has actually been sent to both variants in this round, the comparison opens automatically. Changing the current input removes the comparison for the previous body; changing the mode still requires an explicit send.
- The comparison starts with the two observed outcomes and actual HTTP statuses, followed by a field-by-field business-data delta. An HTTP 200 in both variants is explicitly labelled: the student must compare returned data and behavior. Missing fields, null, zero and false are distinct. Matching normal results are described as matching, not manufactured into a vulnerability.
- Ephemeral request IDs, preview URLs and generated transaction/subscription IDs are excluded only from the semantic delta. Full HTTP bodies and captured response headers remain available as received.
- Each comparison also contains the case's vulnerable and repaired teaching snippets, with changed lines highlighted and the missing check/fix explained. The full executed Python source and interpreter events remain in Source & trace. The selected variant is highlighted in that existing code panel. Teaching snippets are not misrepresented as executable editors or complete source.
- XSS comparisons use recorded browser observations; they do not execute a second hidden payload or treat equal HTTP statuses as evidence. Absence of alert remains a bounded observation.
- Payment pages now attach the existing independent GET readback to the corresponding submitted result. Coupon use, gift balance, subscriptions and replay outcomes appear in the page, and saved-state differences are labelled `GET.resource`. Response-only metadata is retained alongside readback state.
- Directory listing, diagnostic stack/query and public-bundle key lessons now render the actual returned entries, trace and inert server key. Previously these successful responses could appear empty because the page read only `content`. Denied responses do not show the disclosed resource.
- Rejected profile updates show before/after state and rejected fields; rejected identity/JWT/file operations show their access or storage outcome. The selected variant remains visible on narrow layouts; long data and code wrap, and comparison columns stack.
- A new service-worker namespace and versioned changed entry points avoid serving the earlier renderer to returning visitors. Notes and local completion marks retain their existing storage keys.

## Verification

The full JavaScript suite exercises the original engine and rendered controllers. Its 108-case normal-control loop now also verifies the selected fixed code panel. Its 96-case attack loop requires an automatically opened comparison, actual business-data differences, both case-specific snippets and captured HTTP headers. Additional end-to-end checks cover all three previously incomplete disclosure views and coupon/gift/replay/subscription readback views.

Focused renderer tests cover equal-status CORS differences, equivalent bodies with different JSON key order and request IDs, missing/null/false/zero, text-only rendering of HTML input, browser observations, separate saved-state deltas and unsent variants. Offline tests verify referenced versioned assets are precached.

This change does not modify vulnerability engines, cloud service contracts, hosting, or the full explanations. Pixel layout and physical Android behavior have not been verified in a real browser in this change; jsdom does not provide that validation. The earlier live XSS audit is not claimed as a new browser run against this branch.
