# AyuStream AI — Frontend Architecture & Design System

A modern, high-contrast, responsive React + TypeScript emergency care coordination interface built for paramedics, emergency department clinicians, coordinators, and administrators.

---

## Technology Stack

* **Core**: React 18, TypeScript, Vite
* **Styling**: Tailwind CSS with custom healthcare palette
* **Routing**: React Router v6
* **Icons**: Lucide React
* **Data Visualization**: Recharts
* **Real-Time State**: Native WebSocket connection manager with sequence-based replay
* **Audio Synthesis**: Web Audio API synthesizer for Motorola radio chirps, squelch, and call tones
* **Speech Engine**: Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`)

---

## Design System & Palette

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `navy` | `#142B3B` | Sidebars, mobile bottom navigation, hero banners, dark console headers |
| `brand` | `#087F8C` | Primary buttons, active state indicators, focus rings |
| `surface-bg` | `#F7F9F8` | Page workspace background |
| `charcoal` | `#1D2935` | High-contrast primary headings and text |
| `slateText` | `#64748B` | Supporting labels, timestamps, metadata |
| `success` | `#16875D` | Confirmed transfers, active ambulances, ready capacity |
| `warning` | `#D28A21` | Pending acceptances, stale readiness, clinical conflicts |
| `critical` | `#C84848` | Declined transfers, unable capacity, acute deterioration |

---

## Key Interface Components

### 1. Navigation Shell (`Shell.tsx`)
* **Desktop**: Collapsible left sidebar with role-aware route filtering.
* **Mobile Viewports (`<lg`)**:
  * Solid `#142B3B` off-canvas navigation drawer with dark backdrop (`bg-black/65`).
  * Dedicated **Thumb-Friendly Bottom Navigation Bar** with direct 1-tap shortcuts for:
    * `Overview` (`/`)
    * `Cases` (`/cases`)
    * `Floating EMS Radio Intercom` (Center prominent action)
    * `Routes` (`/routes` SmartRoute)
    * `Menu` (Opens full options drawer)

### 2. Live OpenRoute Navigation & GPS (`AmbulanceTracker.tsx`)
* Real-time GPS sharing from paramedic mobile device.
* OpenStreetMap embed with pinpoint coordinates.
* Live OpenRoute / OSRM API telemetry showing distance in km, transit duration in minutes, and direct external navigation link.

### 3. EMS Voice Contact & Radio Intercom (`VoiceIntercomModal.tsx`)
* Push-To-Talk (PTT) microphone capture with live audio level visualization.
* Built-in 1-tap Hinglish dispatch presets for STEMI alerts, flyover ETAs, and vitals drops.
* Direct ER doctor hotline simulation with realistic call timer and two-way dialog.

### 4. SmartRoute Coordination (`Coordination.tsx`)
* Capability screening of potential receiving hospitals based on reported patient condition.
* Mutual agreement workflow: Hospital clinician must explicitly accept transfer before coordinator confirms destination.
* Live OpenRoute transit guidance card.

---

## Development & Build Commands

```bash
# Install dependencies
npm install

# Start local Vite development server (port 5173)
npm run dev

# Run TypeScript typecheck and compile production bundle
npm run build

# Preview production build locally
npm run preview
```
