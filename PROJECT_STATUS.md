# Project Status — AyuStream AI

## Working backend capabilities verified with tests

- FastAPI app imports, starts via lifespan and initializes/reads a clean SQLite database.
- PBKDF2 demo-user authentication, expiring signed JWTs, role-based backend restrictions, hospital-scoped case access.
- Unknown-patient case creation with collision-resistant randomized IDs; bystander/document intake paths and validation.
- Manual reports, deterministic rule-based extraction, strict Pydantic clinical summaries and explicit missing information.
- Report preservation, manual observation capture, conflict creation and human resolution with timeline records.
- Fictional hospital registry, self-reported readiness updates, stale checks and explainable capability screening.
- Acceptance request/response, manual escalation and coordinator-only confirmed destinations from accepted requests.
- Resource reservation with conditional SQL state transition, concurrency conflict detection and release.
- Persisted event sequence, role-aware event history, ACK idempotence, WebSocket delivery/replay and ping/pong.
- Real-time Hinglish EMS voice contact, radio dispatch events (`coordination.radio_dispatch`), and ER doctor pre-arrival directives (`clinical.doctor_directive`).
- Analytics API calculated from stored synthetic case, acceptance and resource records.
- Admin-only synthetic scenario backend and reset functionality.

**Backend validation:** `python3 -m pytest -v` → **17 passed** (66 FastAPI/Python deprecation warnings). Tests cover all core workflows including Hinglish extraction, radio dispatch, and real microphone audio upload/transcription.

## Frontend implementation status

React/TypeScript source is implemented for the login, role-aware navigation, operational overview, case registry, all three intake mode selections, case details, manual reports, microphone recording controls, live speech recognition dictation, file upload, transcripts, JSON review/correction, missing fields, observations, conflicts, SmartRoute, coordinator confirmation, hospital response/readiness, resource inventory, live events, analytics, simulator, and basic admin inspection.

**Humanization, Personalization & Hinglish Voice Contact Upgrades:**
- **Microphone Recording & Live Dictation:** End-to-end microphone capture using `MediaRecorder` + Web Speech API `createSpeechRecognizer` streaming real-time voice into intake and handover notes in Hinglish, Hindi, and English.
- **Audio Transcription Pipeline:** Backend `/api/cases/{case_id}/audio` and `/api/cases/audio/transcribe` endpoints accept recorded audio clips with client dictation fallbacks, verify transcripts, and feed structured clinical extraction.
- **EMS Voice Intercom & Walkie-Talkie Console:** Zero-dependency Web Audio API synthesizer for realistic Motorola radio chirps, squelch, phone ringtones, and priority alarms, with live mic PTT (Push-to-Talk) and hands-free dictation.
- **Hinglish Radio Dispatches (1-Tap):** Built-in presets for acute STEMI alerts, flyover ETA updates, vitals deterioration, and hospital rerouting with Web Speech TTS audio playback and live WebSocket broadcast.
- **Direct ER Doctor Hotline:** Interactive voice call simulator connecting Paramedic Vikram Rathore directly with ER In-charge Dr. Aditi Sen with two-way Hinglish conversation.
- **Personalized Crew Identity:** Paramedic and Doctor duty status switcher, active shift duration counters, station call signs, and badge IDs.
- **Bedside Human Touch & Care:** Visual 0-10 pain & distress scale with facial expressions, patient demeanor tracking, family attendant contact cards, and comfort checklist.
- **Doctor Pre-Arrival Directives:** Receiving emergency physicians can issue immediate roll-in and medication orders directly to the ambulance.

**Frontend validation:** `npm run build` and `npm run typecheck` both pass. Visual, audio, and microphone interactions run seamlessly in the browser.

## Partial / missing requirements

- **Speech input credentials:** Live browser Web Speech API dictation and local fallback audio transcription work out-of-the-box in demo mode. Configured Gemini API transcription is supported when `GEMINI_API_KEY` is provided in production.
- **OCR:** Optional Tesseract/Pillow extraction endpoint exists, with review required; optional native packages and scanner accuracy not verified.
- **Clinical truth:** Sources and conflicts are stored; per-field source timestamps and all provenance states are not implemented consistently in one complete normalized field-metadata layer.
- **Offline resilience:** Visible connection loss, bounded WebSocket reconnect, replay and event deduplication implemented; durable queueing and retry of locally drafted updates are **not implemented**. Do not use offline mode for critical information.
- **Delivery semantics:** Client ACK is persisted; exact per-client delivery state, guaranteed delivery, durable retries, cross-worker event fanout and offline message storage are not implemented.
- **Admin:** Demo user registry is inspectable, but there is no interactive role/account edit endpoint; seeded data changes require editing the seed script.
- **Resource preparation:** Mock inventory, reservation and release exist, but not a full task-by-task staff preparation checklist or electronic assignment sign-off.
- **Analytics:** Stored case, acceptance and resource measures exist; detailed disconnect counts, delivery failure counts, all status event response timings and rich reporting are not tracked persistently.
- **Simulator:** Six backend action scenarios are implemented. The seventh requested scenario (actual WebSocket disconnection and recovery) uses browser offline mode rather than a simulator button. The `resource_race` scenario alone does not create a real parallel race; the automated concurrency test does.
- **Database lifecycle:** SQLAlchemy `create_all` bootstrapping and reset are implemented; no Alembic migration history.
- **Deployment:** Not hardened for production, no real hospital EHR/EMR provider, no mapping ETA integration, no Redis pub/sub, no automatic failover, no penetration test or clinical validation.
- **Original PRD PDF:** The supplied master prompt referred to `AyuStream_AI_PRD_Complete(1).pdf`, but that separate PDF and an existing project repository were **not attached**. Development followed the master build prompt provided with this request, not an unseen PRD.
- **Frontend lockfile:** Not generated due to unavailable npm registry. A `package.json` is provided, but npm dependencies are not bundled (normal source distribution).

## Exact setup / launch commands

In the extracted project directory on Windows:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8001
```

In **a second** terminal from the extracted project directory:

```powershell
cd frontend
npm install
npm run dev
```

Navigate to `http://127.0.0.1:5173` and log in as `coordinator` with password `demo1234`. Use `http://127.0.0.1:8001/docs` for API reference. Run backend tests with `cd backend; python -m pytest -q`. Run frontend build with `cd frontend; npm run build` after installing packages.

## Safety and privacy

**Local synthetic-data demonstration only. Not for real emergency or clinical use.** Static seeded accounts, no at-rest medical-record encryption, no regulatory certification, no actual hospital status or capacity. Audio/document files are not persisted; text reports, summaries and event history remain in the local database until deleted/reset. Establish real communication through proper emergency channels if connection fails.
