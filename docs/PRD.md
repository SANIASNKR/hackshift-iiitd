# AyuStream AI MVP scope

This implementation follows the supplied AyuStream AI end-to-end PRD. It is a synthetic-data coordination demonstration, not a clinical, triage, dispatch, or destination-decision system.

The core workflow is: paramedic creates an unknown-patient case, records a manual or cloud-transcribed report, reviews a structured handover, hospital responds to an acceptance request, a coordinator reviews deterministic capability/readiness alternatives, and only then confirms an explicitly accepted destination. Persisted, authorized WebSocket events support the live timeline, acknowledgements, and replay.

The deterministic demo provider is the default and never invents missing clinical facts. Gemini integration is optional through environment variables; manual entry remains available when no cloud credential is configured.

## Clinical safety

### Intended use and limits

AyuStream AI is a coordination and information-capture aid for synthetic emergency workflows. It is not a medical device, diagnostic system, triage engine, treatment recommender, or substitute for a qualified clinician or dispatcher. The product must not determine acuity, recommend treatment, or make an autonomous destination decision.

Every clinical value shown by the system must remain attributable to an explicitly reported source or a manual entry. Missing information must remain missing; the system must not infer a diagnosis, normal finding, medication, allergy, identity, or clinical recommendation from silence or from a language model output.

### Human review and decision ownership

- Paramedics and other authorized users review extracted handovers against the source report before relying on them.
- Clinical staff retain responsibility for assessment, treatment, escalation, and destination decisions.
- Hospital acceptance, readiness, and destination confirmation are explicit human actions. A model response or a timeout cannot count as acceptance.
- Conflicts, uncertainty, stale readiness, and missing fields must be visible rather than silently resolved.
- Manual entry remains available whenever AI extraction or transcription is unavailable, delayed, or incorrect.

### AI and transcription safeguards

The deterministic provider is the default for the MVP and prefers omissions over inferred medical facts. Optional Gemini processing is constrained to extraction or transcription and must not be used to generate diagnosis, triage, treatment, or clinical recommendations. Provider failures must be surfaced to the user without presenting a fabricated or success-shaped result. Audio and extracted text require the same human verification as manually entered information.

### Safety-critical failure modes

The implementation must preserve the original report, expose processing status, and support retry or manual correction when extraction fails. It must not treat an unavailable provider, missing credential, malformed model response, absent hospital response, stale readiness signal, or conflicting report as a safe default. Audit events should make the source, reviewer, correction, and final decision traceable.

### Privacy, identity, and governance

The MVP uses synthetic data and must not be represented as production clinical infrastructure. Unknown-patient workflows must not require or infer government identity. Production deployment requires access control, least-privilege handling, encryption, retention and deletion rules, incident response, clinical safety review, usability testing with representative users, and applicable legal and regulatory assessment before use with real patient data.
