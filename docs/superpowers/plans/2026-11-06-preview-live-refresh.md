# Preview view updates without document reload

**Goal:** Saved edits, undo/redo and shared styles update the current preview view without replacing its iframe/document. Scale contents becomes opt-in by default. The separate Arabic engine roadmap covers later axis/layout/math work only.

**Cause:** StudioPage.runNow calls reload after every mutation; reload increments frameKey, which is part of the iframe's React key. Every edit therefore destroys the old document, widgets and animation context.

**Approach:** Keep the existing mixed server/client storefront renderer. A trusted parent request asks a thin Next client wrapper to replace the current route with a unique internal view-request query and scroll=false; React merges the new server-component view with stable keys. The server echoes that request and a fresh render stamp, and an acknowledgement is sent after the updated DOM has committed and measurement has run. A serial admin coordinator waits for that acknowledgement before the mutation finishes or temporary gesture CSS is released. Rebuilding all widgets in a separate client renderer would duplicate the storefront and is outside this fix.

**Constraints:** No new dependencies, backend schema changes or merchant data writes. Preserve iframe identity, scroll, unaffected node/client state, and existing origin checks. Saved data and failed preview refresh must be reported separately. Reset/cancel queued refreshes when the preview context changes. A legacy frame without the capability may use the previous reload path during rolling deployment; current supported frames never remount for ordinary edits. Page/language/theme/ticket context navigation remains distinct.

- [x] Add failing refresh-coordinator and real-document-identity regressions.
- [x] Implement trusted refresh/version acknowledgement in the storefront wrapper and bridge.
- [x] Serialize preview updates in the admin and integrate save, history, shared styles and failures.
- [x] Make content scaling default off while respecting explicit saved preferences; update browser cases to opt in.
- [x] Verify style/text/rich text/structure/undo edits preserve document identity, scroll and unaffected client/media state; fix changed-view lifecycle issues if reproduced.
- [x] Review the implementation, run focused tests and both production builds.

## Verification evidence

- Refresh regressions were observed failing before fixes: document identity, successive rich text reconciliation, changed widget configuration, temporary property cleanup, obsolete coordinators, particle tint and runtime ownership.
- Final focused runs: 137 admin tests across 13 files and 19 storefront DOM/bridge tests passed. Storefront typecheck and both production builds passed. Admin app typecheck has the same 50 pre-existing diagnostics as the baseline, with no differences; the root references-only tsconfig is not a meaningful app check.
- An earlier complete real-browser iteration passed 32 checks in 13 scenarios, including document identity, scroll, unchanged DOM, rich text, widget state/config, insertion/removal, history and motion adapters.
- Final browser retry exposed selection-reveal timers moving the viewport mid-drag. A failing DOM regression and the real cross-scale transfer case passed after releasing held reveals at the first geometry/look gesture. The subsequent full run passed 25 checks in ten scenarios, then a development layout chunk failed to load before the next fixture initialized. The final full browser rerun therefore remains incomplete. Automatic review rejected both local production-server launch attempts with only `blocked by policy`; no bypass was attempted.
- The production build completed despite Windows fetch-cache EBUSY warnings. No backend or live merchant mutation was used in verification.

## Delivery

Release through the already-authorized main branch. Verify the deployed admin bundle advertises refreshView/viewUpdated and the refresh control, and the storefront route bundle contains the matching server-echoed __studioView protocol and commit event. Delivery status is reported after inspecting the live assets, separately from this committed implementation record.

Official basis: https://nextjs.org/docs/app/api-reference/functions/use-router and the project's no-store getPagePreview fetch.
