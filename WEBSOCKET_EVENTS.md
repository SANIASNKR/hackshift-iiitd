# WebSocket and Event Reliability Contract

## Connections and authorization

`GET ws://127.0.0.1:8001/ws?token=<JWT>&after=<last_sequence>` is a WebSocket upgrade (the example token is your own demo login token). Server decodes the JWT, rejects unauthenticated connections with code `1008`, and enforces visibility for **each event**, not merely for the connection. `admin` and `coordinator` see all synthetic coordination events; paramedics see their own case events and readiness updates for relevant destinations; hospital staff see their own hospital's events plus intended, confirmed, or acceptance-requested cases. Unauthorized case history is not returned by the REST replay API either.

**Security limitation:** Tokens in WebSocket query strings can appear in server/proxy logs. For production, use short-lived single-use WebSocket tickets or same-site secure session cookies. Only use these demo JWTs on localhost.

## Persisted event envelope

Each event is stored with a unique ID and a global monotonic SQLite `sequence` before `LiveManager.broadcast` attempts delivery. Example:

```json
{
  "id": "61bc8d85-491c-4fc8-bafb-54eef91c5c4e",
  "sequence": 17,
  "event_type": "acceptance.responded",
  "case_id": "AYU-2026-92A6455F21",
  "hospital_id": "HOSP-002",
  "actor_id": "a-demo-user-id",
  "occurred_at": "2026-10-18T10:30:00Z",
  "payload": {"acceptance_id": "a-demo-request-id", "status": "accepted"}
}
```

The client receives `{"type":"event","event":{...},"replayed":true}` for replay, and the same envelope without `replayed` for immediate broadcast. Runtime payloads include limited coordination metadata, **not** whole patient records. Additional server control messages are `ready`, `ping`, `pong`, `ack_confirmed`, and `error`.

## Event types implemented

| Event name | Trigger | Principal payload keys |
| --- | --- | --- |
| `case.created` | Case intake | `identity_mode` |
| `case.updated` | Case patch | `updated_fields` |
| `clinical.report_extracted` | Validated report | `report_id`, `review_status` |
| `clinical.report_confirmed` | Human review | `report_id` |
| `clinical.observation_added` | New observation | `field`, `conflict` |
| `clinical.conflict_resolved` | Human resolution | `conflict_id` |
| `hospital.readiness_changed` | Hospital report/simulator | `readiness`, `constraint` |
| `acceptance.requested` | Coordinator requests acceptance | `acceptance_id` |
| `acceptance.responded` | Hospital accepts/declines | `acceptance_id`, `status` |
| `acceptance.escalated` | Manual/timeout/simulator | `acceptance_id`, `manual` or `timeout` |
| `destination.confirmed` | Coordinator confirms accepted destination | `hospital_id`, `previous_hospital_id` |
| `resource.reserved` / `resource.released` | Atomic resource transitions | `resource_id` |
| `clinical.conflict_flagged`, `ai.provider_unavailable`, `hospital.status_stale`, `resource.race_simulated` | Synthetic failure-simulator scenarios | Scenario-specific flags |

## Acknowledgement and replay

1. A write endpoint inserts an Event and commits the transaction. Only **after** commit does it attempt WebSocket broadcast.
2. A client ACKs via WebSocket `{"type":"ack","event_id":"..."}` or REST `POST /api/events/{event_id}/ack`.
3. ACK records are unique per `(event_id,user_id)`; repeated ACKs do not create duplicate rows.
4. Clients persist the latest received sequence in localStorage, reconnect with an exponentially bounded delay (up to ~15s), and request replay from that cursor. The UI de-duplicates repeated event IDs.
5. REST history `GET /api/events?after=SEQ&limit=100` is also role-filtered. If many events accumulate, the client must paginate; the WebSocket initial replay has a 1,000-row query limit.
6. A successful ACK means **client receipt only**. It is not hospital acceptance, clinical confirmation, or guaranteed human reading.
7. SQLite sequence is **global**, not a guaranteed gap-free count. Historical gaps may occur due to permission filtering.

## Honest limitations

- A single in-process WebSocket connection manager handles live fanout. Multi-worker or multi-instance deployment needs Redis/NATS plus distributed auth and delivery coordination.
- There is a heartbeat; however durable per-message delivery retries, exponential job persistence, and formal delivery state transitions are not implemented. Persistent events allow retrospective replay.
- Browser localStorage cursors are best-effort and do not guarantee durable offline availability.
- Server restart retains events in SQLite but not active connections; clients reconnect.
- The simplified REST replay scans up to 2,000 candidate records and should use SQL-level ACL filtering and cursor pagination at scale.
- Reconnection does not replace established emergency radio/telephone escalation.
