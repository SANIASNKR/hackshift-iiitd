# Security, Data Retention and Clinical Safety

## Intended use

This is a localhost-only software demonstration. It has not undergone clinical validation, independent security testing, regulatory assessment, disaster-recovery certification, or operational safety validation. Do **not** use it for real patients, medical advice, emergency dispatch, resource assignments, hospital transfers, or live emergency response.

## What is implemented

- Role authorization on key backend REST endpoints and WebSocket event visibility checks.
- PBKDF2-hashed seed passwords, signed expiring JWTs, strict basic Pydantic input validation.
- SQLite foreign keys, unique event IDs and acknowledgements, conditional reservation update.
- Audio/image size caps and content-type allowlists, no audio/image file retention by the API.
- Reports preserve original text; missing clinical facts remain unknown. Structured extraction produces no clinical diagnosis or destination decision.
- Human-only destination confirmation following explicit hospital acceptance.
- CORS allowlist with localhost defaults.

## Important unresolved risks

- **Demo credentials:** All seeded users share `demo1234` and are public by design. Use never on Internet-exposed servers.
- **Default JWT signing secret:** A static demo fallback is available for localhost if `JWT_SECRET` is not set. It is unsafe for public access. Set a long high-entropy value before any non-local experimentation.
- **Token storage:** Browser localStorage holds JWT, and WebSocket uses a query parameter. Both are inappropriate for sensitive production data without a separate threat model.
- **Database:** SQLite stores reports and other personal fields without at-rest application-layer encryption. No automatic deletion policy is implemented. Reset removes the local database records, but the caller remains responsible for backups/copies.
- **No comprehensive PHI protection:** No data-loss prevention, secure audit immutability, medical-device certification, live-hospital integration, advanced monitoring, real patient consent or retention controls.
- **No upload anti-malware or image authenticity scanning.** File MIME is checked, not cryptographically validated. Optional OCR is unverified.
- **No general API rate limiting or lockout.** Never use this service on a public network.
- **No distributed WebSocket cluster** or long-term message delivery guarantees.
- **No human-in-the-loop enforcement outside the documented UI** for all clinical fields; role checks are role-based, not formal professional credential checks.
- **Simulator reset** deletes synthetic data and should never be enabled for production.

## Emergency communication fallback

When disconnected, mark the application offline; do **not** assume that any message, observation, hospital request or destination choice has been transmitted. For a genuine emergency, follow established phone/radio dispatch and hospital handover channels rather than attempting to use this prototype. A silent or timed-out hospital request is **not** acceptance.

## Provider privacy

If OpenAI is configured, uploaded audio and the report transcript are sent to the configured service. User must evaluate the provider's privacy terms, consent and suitability; use **synthetic reports only**. All external provider failures should be visible. No uploaded audio or document image is intentionally saved to local disk by the API; textual transcriptions, summaries and reports are persisted until reset.
