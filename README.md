# AyuStream AI — Pre-Hospital Emergency Coordination (Synthetic Demonstration)

A full-stack **hackathon demonstration** for paramedic handovers, hospital capability screening, explicit acceptance, confirmed destinations, resource reservations and persisted WebSocket events.

> **Safety:** This software is **not** clinically validated, not connected to real hospitals, and **must not be used for real patients, dispatch, treatment, routing, or emergency decisions**. Fictional hospitals and synthetic patient records only. Follow established emergency radio/telephone protocols for real communication and any network interruption.

## Stack

- **Web UI:** React 18, TypeScript, Vite, Tailwind CSS, React Router, Lucide, Recharts.
- **API:** Python 3.11+, FastAPI, Pydantic, SQLAlchemy, SQLite, JWT demo tokens.
- **Realtime:** authenticated WebSocket `/ws`, per-user authorization, persisted sequence numbers, reconnect and replay, client ACKs.
- **AI:** auditable deterministic demo extraction; optionally Gemini speech-to-text and strict-schema clinical extraction with separately configured credentials. No local speech-to-text inference is faked.
- **Storage:** SQLite created on first API launch. No image/audio files are persisted. Reports, extracted text and event history are retained locally until the demo database is deleted/reset.

## Run on Windows (PowerShell)

Prerequisites: **Python 3.11+**, **Node 20+**, and npm. Use two terminals from the extracted `AyuStream_AI` folder.

**Terminal 1 — backend**

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

**Terminal 2 — frontend**

```powershell
cd frontend
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. Interactive FastAPI docs: **http://127.0.0.1:8001/docs**.

> If PowerShell blocks activation, launch `backend\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001` from the project root instead. Make sure the backend has been installed into that interpreter.

## Run on macOS / Linux

```bash
# Shell 1: project root
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001

# Shell 2: project root
cd frontend
npm install
npm run dev
```

The Vite development proxy sends `/api` and `/ws` requests to `127.0.0.1:8001`. For separate hosts, set `VITE_API_URL` in `frontend/.env` and `CORS_ORIGINS` on the backend. This is a **localhost-only example**, not a secure deployment guide.

## Demo credentials

Every PRD account below uses **`demo123`**. Accounts are created automatically the first time the backend starts with an empty database.

| Username | Role | Access |
| --- | --- | --- |
| `paramedic@ayustream.demo` | Paramedic | Create/update own cases, reports, observations, status |
| `coordinator@ayustream.demo` | Coordinator | All case coordination, SmartRoute, acceptance requests, final destination |
| `hospital1@ayustream.demo` | Hospital staff | Northbridge General cases and resources |
| `hospital2@ayustream.demo` | Hospital staff | Riverbend Medical cases and resources |
| `admin@ayustream.demo` | Administrator | Demo simulator, reset, all data |

Fictional hospitals are **Northbridge General**, **Riverbend Medical**, **Cedar Children's**, and **Harbor Community**. All capacities and readiness statuses are simulated. No geographic travel times are fabricated.

## Run the end-to-end showcase

See [`DEMO_GUIDE.md`](DEMO_GUIDE.md) for a detailed guided multi-account walkthrough. Typical workflow:

1. Login as `paramedic`. Create an **unknown-patient** case; select **Northbridge General** and reported capability `cardiac`.
2. Open the case and enter a synthetic report, e.g. `Synthetic patient reports chest pain, pulse 110 bpm, SPO2 94%, BP 132/86`.
3. Review the original report, extracted fields and missing information. Submit another differing heart-rate observation to view the conflict.
4. As `north`, change readiness to `unable` to simulate a capacity issue; the coordinator sees the change.
5. As `coordinator`, open SmartRoute, request acceptance at Riverbend Medical.
6. As `river`, respond `accepted` in Hospital Command.
7. As `coordinator`, explicitly **confirm destination** to Riverbend.
8. As `paramedic`, observe the destination change and event history; inspect the Live Monitor to verify event sequence and replay.

## Configuration

Copy `.env.example` to `.env` and load it into your shell **only if** you want to override local defaults. Defaults are suitable only for localhost demos. For Windows PowerShell you can set e.g. `$env:AI_PROVIDER = "gemini"; $env:GEMINI_API_KEY = "..."` before starting the backend. `.env` is intentionally **not auto-loaded** by the Python app; you must set the environment variables or use uvicorn's `--env-file` option (requires `python-dotenv`).

Speech-to-text upload uses Gemini only when `AI_PROVIDER=gemini` and a valid `GEMINI_API_KEY` is present. The deterministic demo provider supports **manual report extraction only** and rejects audio instead of inventing a transcript. The optional OCR endpoint needs Pillow, pytesseract and an installed Tesseract executable. Install extras with `pip install -r backend/requirements-ocr.txt` as needed. Not all optional external services can be tested without credentials.

## Test commands

```bash
cd backend
python -m pytest -q
# from frontend, with npm dependencies installed
npm run build
npm run typecheck
```

See [`PROJECT_STATUS.md`](PROJECT_STATUS.md) for **exact verification results and limitations**. The backend suite, frontend production build, and TypeScript check have been run in this workspace.

## Documentation

- [`PROJECT_STATUS.md`](PROJECT_STATUS.md): tested features, partial features, known limits.
- [`DEMO_GUIDE.md`](DEMO_GUIDE.md): scenario and multi-account judge walkthrough.
- [`WEBSOCKET_EVENTS.md`](WEBSOCKET_EVENTS.md): event data, access checks, reconnect, replay and ACKs.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): architecture diagram, records and trust boundaries.
- [`docs/API.md`](docs/API.md): route matrix, key request formats and examples.
- [`docs/SECURITY.md`](docs/SECURITY.md): medical safety, security and data handling caveats.
- [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md): executed tests versus tests not run.

## Packaging

To create `AyuStream_AI_Complete_Project.zip` from the **parent folder**:

```bash
python AyuStream_AI/scripts/package.py
```

The script excludes virtual environments, caches, local databases, `node_modules`, builds, secrets and previous ZIP files, and verifies archive readability.
