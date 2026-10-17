# AyuStream AI — API Reference

FastAPI interactive schemas: `http://127.0.0.1:8001/docs`; OpenAPI JSON at `/openapi.json`. All routes below begin with `/api`. All except health and login require `Authorization: Bearer <JWT>`.

## Endpoint matrix

| Verb | Route | Access | What it does |
| --- | --- | --- | --- |
| POST | `/auth/login` | Public | Login seeded demo user |
| GET | `/auth/me` | Logged-in | Current user, no password hash |
| GET | `/health` | Public | Local demo health |
| GET | `/cases` | Logged-in | Role-filtered case list |
| POST | `/cases` | Paramedic/coordinator/admin | Create case |
| GET | `/cases/{id}` | Role-filtered | Case, reports, observations, conflicts, acceptances, timeline |
| PATCH | `/cases/{id}` | Creator paramedic/coordinator/admin | Update selected case fields |
| POST | `/cases/{id}/reports` | Creator paramedic/coordinator/admin | Save original text, extract schema-validated summary |
| POST | `/cases/{id}/audio` | Creator paramedic/coordinator/admin | Transcribe uploaded audio with configured provider, no audio retention |
| POST | `/cases/identity/ocr` | Paramedic/coordinator/admin | Optional unverified OCR of synthetic image |
| PATCH | `/cases/{id}/reports/{report_id}/review` | Authorized case users | Persist human-reviewed structured summary |
| POST | `/cases/{id}/observations` | Authorized case users | Add manual observation and flag potential conflicts |
| POST | `/cases/{id}/conflicts/{id}/resolve` | Authorized case users | Resolve with written human note |
| GET | `/hospitals` | Logged-in | List fictional hospitals, capabilities and stale flag |
| PATCH | `/hospitals/{id}/readiness` | Assigned hospital/admin | Update reported readiness |
| GET | `/cases/{id}/matches` | Authorized case users | Explainable alternatives and exclusions |
| POST | `/cases/{id}/acceptances` | Coordinator/admin | Request receiving hospital acceptance |
| POST | `/acceptances/{id}/respond` | Assigned hospital/admin | Explicit `accepted` or `declined` response |
| POST | `/acceptances/{id}/escalate` | Coordinator/admin | Manual escalation; never acceptance |
| POST | `/cases/{id}/destination` | Coordinator/admin | Confirm destination only after accepted request |
| GET | `/resources` | Logged-in | Role-filtered mock resources |
| POST | `/resources/{id}/reserve` | Assigned hospital/admin | Conditional atomic resource reservation |
| POST | `/resources/{id}/release` | Assigned hospital/admin | Release reserved resource |
| GET | `/events` | Logged-in | Role-filtered persisted replay with sequence cursor |
| POST | `/events/{id}/ack` | Visible event recipients | Idempotent client receipt acknowledgement |
| GET | `/analytics` | Hospital/coordinator/admin | Metrics from stored records |
| GET | `/users` | Admin | Demo account inventory |
| POST | `/demo/scenario` | Admin | Trigger a synthetic failure scenario |
| POST | `/demo/reset` | Admin | Delete/reset local demo database, invalidates logins |
| WS | `/ws?token=...&after=...` | Logged-in | Authenticated WebSocket events and ACK/heartbeat |

## Examples

Get demo token:

```bash
curl -s -X POST http://127.0.0.1:8001/api/auth/login \
 -H 'Content-Type: application/json' \
 -d '{"username":"paramedic","password":"demo1234"}'
```

Create a synthetic unknown patient case (replace `$TOKEN` with the returned token, using normal shell syntax):

```bash
curl -X POST http://127.0.0.1:8001/api/cases \
 -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
 -d '{"identity_mode":"unknown","complaint":"Synthetic chest pain","required_capabilities":["cardiac"],"intended_hospital_id":"HOSP-001"}'
```

Request acceptance after creating a case, as `coordinator`:

```json
{"hospital_id":"HOSP-002"}
```

Hospital responds at `/acceptances/{id}/respond`:

```json
{"status":"accepted","note":"Demo accepting ED confirms readiness"}
```

Coordinator confirms accepted destination:

```json
{"acceptance_id":"a-previously-accepted-request-id","reason":"Coordinator review completed"}
```

## Notes

- Validation errors use FastAPI 422, unauthorized is 401, forbidden is 403, missing is 404, resource/acceptance conflicts are 409, unsupported uploads are 415, oversized uploads are 413, missing external provider capability is 503.
- The case listing currently scopes in Python and supports a basic string query and pagination; this is fine for a small demo but not a large deployment.
- No generalized idempotency-key REST middleware, upload antivirus scanning or production-grade rate limiting is included.
- API examples are synthetic and do not represent real medical recommendations.
