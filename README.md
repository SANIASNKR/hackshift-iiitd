# AyuStream AI

### AI-Powered Pre-Hospital Emergency Triage and Coordination

AyuStream AI is a voice-driven pre-hospital emergency coordination
platform designed to connect ambulance teams with hospital emergency
departments before a patient arrives. It captures emergency updates,
converts speech into structured clinical information, and delivers
incoming-patient alerts to a hospital dashboard in real time.

> **Hackathon theme:** Reimagining Healthcare Through Technology\
> **Initial MVP timeline:** 4--5 hours

## Table of Contents

-   [The Problem](#the-problem)
-   [Our Solution](#our-solution)
-   [Core Features](#core-features)
-   [How It Works](#how-it-works)
-   [System Architecture](#system-architecture)
-   [Technology Stack](#technology-stack)
-   [Suggested Project Structure](#suggested-project-structure)
-   [Getting Started](#getting-started)
-   [Example Clinical Handover](#example-clinical-handover)
-   [MVP Scope and Limitations](#mvp-scope-and-limitations)
-   [Safety and Privacy](#safety-and-privacy)
-   [Success Metrics](#success-metrics)
-   [Team Workstreams](#team-workstreams)
-   [Future Scope](#future-scope)
-   [Project Status](#project-status)

## The Problem

Emergency handovers between ambulances and hospital emergency
departments can be stressful and fragmented. Important information may
be missed, misunderstood, or delayed when communicated verbally.

Common challenges: - Symptoms and vital signs may not be communicated
consistently. - Medications or interventions administered during transit
may be omitted. - An unconscious or unidentified patient may not have
official identity details available. - Hospital staff may receive
limited information before the ambulance arrives. - Separate ambulance
and hospital workflows can make updates difficult to track.

## Our Solution

AyuStream AI provides a shared digital handover workflow for paramedics
and receiving hospital teams.

The paramedic creates an emergency case, chooses an intake method, and
records a short voice update. A speech-recognition service transcribes
the audio, and a language model converts the transcript into structured
clinical information. The backend validates and stores the case, then
sends it to the hospital dashboard through a real-time connection.

The dashboard displays the incoming case, reported clinical information,
suggested triage priority, and mock resource availability so authorized
staff can review the case and prepare for arrival.

## Core Features

### 1. Ambient Scribe Button

-   One-tap recording interface for emergency updates.
-   Upload recorded audio for transcription and clinical structuring.
-   Display processing status and the resulting clinical summary.
-   Allow manual entry or retry when transcription fails.

For the initial MVP, recording and uploading a short audio clip is
sufficient; continuous streaming is optional.

### 2. Triple-Identity Intake

AyuStream AI supports three patient intake modes:

-   **Bystander Information:** Record or enter information provided by a
    bystander, such as a name, approximate age, symptoms, or
    circumstances of the emergency.
-   **Identity Document Scan:** Upload an identity-document image and
    use OCR to extract supported text fields for review.
-   **Unknown Patient:** Generate a unique temporary identifier, such as
    `UNKNOWN-M-007`, so the case can proceed without waiting for
    identity verification.

Missing information remains unknown rather than being invented. Use
synthetic identity data for hackathon demonstrations.

### 3. Hinglish Audio Transcription

-   Convert supported Hindi, English, and Hinglish speech into text.
-   Preserve clinically important terms, numbers, units, and medication
    names as accurately as possible.
-   Return the transcript to the backend.
-   Handle transcription failures without crashing the workflow.

**Proposed providers:** OpenAI Whisper API or Deepgram. Actual accuracy
should be evaluated using representative test audio.

### 4. Clinical SOAP Structuring

A language model converts an unstructured transcript into validated JSON
containing available information such as: - Patient and case
identifiers - Chief complaint and symptoms - Available vital signs -
Relevant medical history, if provided - Reported medications and
interventions - Allergies, if provided - Missing or unclear
information - Suggested triage priority - Timestamp and processing
status

The backend validates model output before saving or transmitting it.
Missing information must not be fabricated.

**Proposed providers:** Gemini API or OpenAI API.

### 5. Real-Time Hospital ER Dashboard

The dashboard provides: - Incoming emergency case list - Patient or
temporary case identifier - Arrival status or estimated arrival time,
when available - Chief complaint and clinical summary - Reported vital
signs - Suggested triage priority - Missing or unclear information -
Latest update timestamp - Bed and equipment availability

Red, yellow, and green indicators may communicate configured review
priorities. These are interface indicators, not independently validated
diagnoses. Clinical decisions remain with authorized medical
professionals.

### 6. Live Alert Ticker

-   Display new cases automatically without a manual page refresh.
-   Show a visual alert when a new case or significant update arrives.
-   Optionally play an alert sound.
-   Reflect clinical-summary updates in real time.
-   Display the latest update timestamp.

**Proposed technology:** FastAPI WebSockets or Supabase Realtime.

### 7. Dynamic Bed and Equipment Allocation

The MVP uses a mock database of beds and equipment, such as ventilators,
to demonstrate resource preparation. - Track available and occupied
resources. - Suggest resources using configured demonstration rules. -
Allow authorized staff to confirm an allocation. - Update mock resource
status after confirmation. - Prevent simultaneous reservations of the
same resource.

This is a simulated workflow, not a clinically validated allocation
system.

### 8. Local Queue Buffer

The MVP may demonstrate how updates are retained during temporary
network interruptions. - Simulate a disconnected network. - Store
pending updates in a local queue or controlled mock. - Mark updates as
pending synchronization. - Simulate synchronization after connectivity
returns. - Preserve update order and timestamps.

Production-grade offline synchronization is outside the initial MVP
scope.

## How It Works

1.  **Create a case:** The paramedic starts a new emergency case.
2.  **Select intake mode:** Choose bystander information, identity
    document scan, or unknown patient.
3.  **Capture information:** Record a short voice description of the
    patient's condition, available vital signs, symptoms, and
    interventions.
4.  **Transcribe audio:** The backend sends audio to the selected
    speech-recognition provider.
5.  **Structure the handover:** The language model extracts available
    fields and returns clinical JSON.
6.  **Validate the result:** The backend validates the response and
    marks missing or invalid information appropriately.
7.  **Suggest triage priority:** Configured triage logic presents a
    suggested priority for professional review.
8.  **Send the alert:** The backend stores the case and publishes a
    real-time event.
9.  **Prepare resources:** Hospital staff review the case and confirm
    any simulated resource allocation.
10. **Complete handover:** Receiving staff review and confirm the
    information needed for clinical handover.

## System Architecture

``` text
              PARAMEDIC INTERFACE
             React.js / Mobile App
                      |
             Patient Intake + Audio
                      |
                      v
                FASTAPI BACKEND
                      |
              Speech Recognition API
               Whisper / Deepgram
                      |
                      v
                  TRANSCRIPT
                      |
                      v
                LLM STRUCTURING
                 Gemini / OpenAI
                      |
                      v
             JSON SCHEMA VALIDATION
                      |
                      v
          CASE STORAGE + TRIAGE LOGIC
                      |
               +------+------+
               |             |
               v             v
        REAL-TIME EVENTS   MOCK RESOURCE DB
         WebSockets        Beds / Equipment
               |
               v
         HOSPITAL ER DASHBOARD
             React.js / UI
```

### Main Subsystems

-   **Paramedic Interface:** Patient intake, audio recording/upload,
    manual entry, document upload, and case status.
-   **Backend and AI Engine:** Audio handling, transcription
    integration, clinical JSON generation and validation, case storage,
    triage logic, resource status, and real-time events.
-   **Hospital Dashboard:** Incoming cases, summaries, alerts, suggested
    priority, and mock resource availability.

## Technology Stack

  -----------------------------------------------------------------------
  Component                           Proposed Technology
  ----------------------------------- -----------------------------------
  Paramedic interface                 React.js; Flutter or React Native
                                      if a dedicated mobile app is
                                      required

  Hospital dashboard                  React.js + Tailwind CSS

  Backend                             Python FastAPI

  Speech recognition                  OpenAI Whisper API or Deepgram

  Clinical structuring                Gemini API or OpenAI API

  Real-time updates                   FastAPI WebSockets

  Initial database                    SQLite

  Optional managed real-time storage  Supabase

  OCR                                 Tesseract or an available OCR API

  Resource allocation                 Mock database and backend rules
  -----------------------------------------------------------------------

For the first MVP, select one speech-recognition provider and one
language-model provider. Avoid integrating multiple providers unless the
primary integration fails. SQLite is sufficient for a local
demonstration; Supabase can be considered if shared cloud storage or
managed real-time features are needed.

## Suggested Project Structure

This is a suggested starting structure. Adapt it to the repository and
features actually implemented.

``` text
ayustream-ai/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── styles/
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   └── schemas/
│   ├── requirements.txt
│   └── .env.example
├── docs/
│   └── architecture.md
├── .gitignore
└── README.md
```

Only keep directories and files that exist or are intentionally planned
in the repository. Do not commit API keys, real patient records,
identity documents, or sensitive audio.

## Getting Started

The exact commands depend on the implementation and repository
structure. The following is a general setup outline.

### Prerequisites

-   Python 3.10+ (use the version supported by your dependencies)
-   Node.js and npm
-   An API key for the selected speech-recognition provider
-   An API key for the selected language-model provider

### 1. Clone the Repository

``` bash
git clone <YOUR_REPOSITORY_URL>
cd ayustream-ai
```

Replace `<YOUR_REPOSITORY_URL>` with your actual Git repository URL.

### 2. Set Up the Backend

``` bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

**Windows PowerShell**

``` powershell
.venv\\Scripts\\Activate.ps1
```

**Windows Command Prompt**

``` bat
.venv\\Scripts\\activate.bat
```

**macOS / Linux**

``` bash
source .venv/bin/activate
```

Install dependencies if `requirements.txt` is present:

``` bash
pip install -r requirements.txt
```

Create a local `.env` file based on `.env.example` if the project
provides one. Add provider keys locally and never commit the `.env`
file.

Start the API using the entry point configured in your implementation.
For example, if the FastAPI instance is named `app` in `app/main.py`:

``` bash
uvicorn app.main:app --reload
```

### 3. Set Up the Frontend

Open a separate terminal:

``` bash
cd frontend
npm install
npm run dev
```

Use the local address printed by the frontend development server.

> These are setup examples, not a claim that the repository already
> contains these exact files, scripts, or endpoints. Update this section
> once the actual codebase is finalized.

## Example Clinical Handover

The following is a **synthetic example for demonstration only**.

**Spoken update:**

> "Male patient, approximately 50 years old, road accident, BP 80/50,
> breathing difficulty. Oxygen started."

A structured handover might contain:

``` json
{
  "case_id": "CASE-DEMO-001",
  "patient_identifier": "UNKNOWN-M-007",
  "identity_status": "unknown",
  "chief_complaint": "Road traffic accident",
  "symptoms": [
    "Breathing difficulty"
  ],
  "vitals": {
    "blood_pressure": {
      "value": "80/50",
      "source": "transcribed paramedic report",
      "verification_status": "unverified"
    }
  },
  "interventions": [
    "Oxygen administration reported"
  ],
  "allergies": "unknown",
  "missing_fields": [
    "Additional assessment details"
  ],
  "triage_priority": "requires urgent professional review",
  "case_status": "incoming"
}
```

The example illustrates the intended data shape only. The actual schema
may differ, and the system must not infer unreported observations or
treat the sample as a validated clinical decision.

## MVP Scope and Limitations

The initial MVP prioritizes a working end-to-end demonstration: - Create
an emergency case. - Select an intake mode, including unknown patient. -
Record or manually enter emergency information. - Transcribe and
structure a test case using supported AI services. - Validate and store
the clinical summary. - Show missing or unclear fields. - Deliver the
case to the ER dashboard in real time. - Display a suggested priority. -
Demonstrate staff-confirmed mock resource allocation. - Demonstrate at
least one failure scenario safely.

The following are outside the initial MVP scope: - Production-grade
ambulance deployment - Fully autonomous clinical triage or treatment
decisions - Real hospital EHR integration - Live government identity
verification - Production-ready ABDM integration - Guaranteed
transcription accuracy in all noisy environments - Guaranteed end-to-end
latency below 3.8 seconds - Production-grade offline synchronization -
Real-world automatic bed or ventilator control - Clinical validation or
regulatory approval - Large-scale hospital analytics

### Performance Target

The original stretch target is less than **3.8 seconds** from audio
submission to dashboard update for a short audio sample. This is a
target to measure, not a guarantee. Latency depends on audio duration,
network conditions, and external API response times. Report measured
results honestly.

## Safety and Privacy

AyuStream AI is intended to support emergency professionals, not replace
clinical judgment.

-   Use synthetic patient data for hackathon demonstrations.
-   Keep API keys in environment variables, never in frontend code or
    public repositories.
-   Use HTTPS and authenticated access for deployed applications.
-   Restrict access to patient information according to user roles.
-   Avoid retaining unnecessary audio recordings or identity documents.
-   Protect stored medical data and define retention policies.
-   Mark missing or unclear information explicitly.
-   Do not fabricate clinical values when the AI output is incomplete or
    invalid.
-   Present triage priority as a suggestion for professional review.
-   Require authorized staff to confirm real clinical and resource
    decisions.
-   Treat future ABDM integration and compliance as separate
    implementation and validation work.

The MVP must not be represented as clinically validated,
regulator-approved, or ABDM-compliant unless those claims are
independently substantiated.

## Success Metrics

Evaluate the prototype using measured results: - Successful emergency
case creation rate - Successful transcription rate on the prepared test
set - Correct extraction of predefined clinical fields - Correct
handling of missing or unclear values - Time from audio submission to
dashboard rendering - Successful delivery of real-time dashboard
updates - Successful handling of invalid model output - Successful
completion of the full demonstration workflow

Results should be measured on the test cases used. Prototype metrics are
not proof of clinical effectiveness.

## Team Workstreams

### Frontend

-   Paramedic intake interface
-   Audio recording and submission
-   Patient identification options
-   ER dashboard and alerts

### Backend and Integration

-   FastAPI endpoints
-   Case management
-   Database integration
-   WebSocket communication
-   Resource allocation logic

### AI and Product Integration

-   Speech recognition
-   Clinical JSON generation
-   Schema validation and error handling
-   Test cases and end-to-end verification
-   Demo preparation and documentation

One team member should own end-to-end integration so frontend, backend,
and AI components use compatible interfaces.

## Future Scope

Potential future development areas include: - More robust offline
recording and synchronization - Improved Hinglish transcription for
noisy ambulance environments - Hospital EHR integration - Verified
patient identity matching where legally and operationally appropriate -
Hospital-specific triage protocols - Ambulance location and
estimated-arrival tracking - Real-time hospital capacity integration -
Access controls, audit trails, and operational analytics - Evaluation
with healthcare professionals and appropriately governed clinical data

These are future possibilities, not commitments that the initial MVP
already implements.

## Project Status

AyuStream AI is scoped as a hackathon MVP. Features may be implemented,
simulated, or planned depending on the current repository state. Update
this section as development progresses and clearly distinguish working
functionality from demonstrations and future work.

------------------------------------------------------------------------

## One-Line Summary

**AyuStream AI captures emergency information from paramedics, converts
supported speech into structured clinical summaries, and sends
incoming-patient updates to a hospital dashboard in real time so the
receiving team can prepare before arrival.**
