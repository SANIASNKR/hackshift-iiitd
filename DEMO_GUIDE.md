# AyuStream AI — Demonstration Walkthrough

**All hospitals, resources and patients are fictional. The product is an unvalidated development demo, not an emergency-response service.**

## Prepare

1. Start backend and frontend as shown in README.
2. For a clean demo, log in as `admin`, open **Failure simulator**, click **Reset demo data**, then log in again. This deletes the local demo database contents. Reset invalidates existing tokens.
3. Use separate private windows or browser profiles so that different demo accounts can remain signed in at once. Password for all: `demo1234`.
4. Keep the **Live event monitor** open in the coordinator window and view the status indicator at the top right.

## Factory demonstration data

The factory seed is populated so the main screens are useful immediately after login:

- Three linked synthetic cases: an active cardiac handover, an active trauma case awaiting acceptance, and a completed pediatric case.
- Clinical transcripts with extracted vitals, missing-information indicators, manual observations, and one unresolved heart-rate conflict.
- Accepted, declined, and pending hospital acceptance requests, including a confirmed destination change.
- A reserved monitored bed and a resource action for the cardiac case.
- Four fictional hospitals with capabilities, readiness states, constraints, and demo users.

The live event monitor starts empty after a reset by design; it records new actions performed during the walkthrough. This keeps transport ACKs and persisted events tied to real demo interactions rather than pre-recorded clinical approval.

## Case → handover → alternative → acceptance → destination

1. As `paramedic`, select **New intake**, **Unknown patient**, required capabilities `cardiac`, intended hospital **Northbridge General**. Enter complaint `Synthetic patient with chest pain` and create case. Copy the generated AYU ID.
2. In the case, under **Add emergency report**, enter: `Synthetic patient reports chest pain, pulse 110 bpm, SPO2 94%, BP 132/86. No further history reported.` Submit. Observe that the transcript remains available and omitted allergies/medications/history are highlighted as missing.
3. To show uncertainty handling, add the manual observation `heart_rate`, value `95`, unit `bpm`. The backend keeps both the `110 bpm` extraction and `95 bpm` observation. Use **Resolve with recorded note** only after entering a human review explanation.
4. Open a second browser profile as hospital user `north`. Navigate to **Hospital command center** and report readiness `unable`; enter simulated constraint `No cardiac intake currently available (synthetic)`.
5. As `coordinator`, open **SmartRoute** and select the case. Northbridge must be excluded as unable. Riverbend will remain eligible for the reported `cardiac` capability (readiness is *not* a case-specific acceptance).
6. The coordinator clicks **Request acceptance** for Riverbend. Verify the case-specific pending request appears in **Hospital command** for hospital user `river`.
7. As `river`, click **Accept** on the request. Observe explicit acceptance status on coordinator SmartRoute.
8. As `coordinator`, click **Confirm destination** for that accepted request. This requires coordinator permission; a mere suggestion or pending request will not suffice.
9. As `paramedic`, reopen the case to see **Confirmed destination: Riverbend Medical**; the persisted timeline shows the created case, clinical report, readiness update, request, acceptance and confirmation.
10. Open **Live event monitor**. Disconnect the client in Chrome DevTools (`Network > Offline`) and reconnect. The client displays disconnected/reconnecting and requests missed events using the last event cursor. The server maintains event order by sequence number, while the UI suppresses duplicate IDs in memory.

## Failure simulator (admin)

Open **Failure simulator** as `admin`. Buttons persist backend changes to synthetic records:

- **Hospital cannot accept:** Northbridge readiness changes to unable.
- **No hospital response:** a synthetic overdue Riverbend request is created and escalated (without being interpreted as accepted).
- **Clinical information conflict:** demo case stores two distinct heart-rate values.
- **AI provider unavailable:** a synthetic provider failure event is emitted; manual entry remains the fallback. To test a *real* provider configuration error, request audio transcription with no API key and observe HTTP 503.
- **Stale hospital status:** Riverbend last-update timestamp is backdated and readiness is labelled stale.
- **Resource reservation race:** seeds a reserved resource; attempt to reserve it via the Resource page and observe HTTP 409. A separate automated test submits two simultaneous reservations and asserts one succeeds.

There is no fake button to disconnect the real network: use browser offline mode. All simulator actions are explicitly labelled simulated.

## Acceptance timeout

The backend evaluates unanswered acceptance requests approximately every 10 seconds. `ACCEPTANCE_TIMEOUT_SECONDS` defaults to `120` (see root `.env.example`). A timeout records an escalation and **never auto-accepts** a request. In the demo, the `no_response` scenario creates an already-overdue request and its escalation immediately.

## What to point out

- Role-based access is checked server-side, including hospital separation.
- Missing clinical data remains unknown; the extractor makes no diagnostic assessment.
- Hospital capability screening is explainable and distinct from explicit acceptance.
- Persisted events and ACKs are distinct from actual human action.
- The alternative destination requires deliberate coordinator confirmation.
- The test suite is runnable without any external medical or AI service.
