# AyuStream AI — OpenRoute & GPS Navigation Integration

## Overview

AyuStream AI connects moving ambulances (`Rig BLS-108`) with regional receiving emergency departments and central emergency dispatch coordinators. To ensure zero misdirection and rapid transit, AyuStream integrates real-time routing using Open Source Routing Machine (OSRM) and OpenStreetMap routing APIs with an autonomous urban emergency fallback system.

## API Endpoints

### 1. General OpenRoute Calculation
* **Method**: `GET`
* **Route**: `/api/routes/open-route`
* **Access**: Authenticated (`paramedic`, `hospital`, `coordinator`, `admin`)
* **Parameters**:
  * `origin_lat`: Latitude of origin ambulance GPS (e.g. `12.9716`)
  * `origin_lon`: Longitude of origin ambulance GPS (e.g. `77.5946`)
  * `dest_lat`: Latitude of receiving hospital trauma bay (e.g. `12.9784`)
  * `dest_lon`: Longitude of receiving hospital trauma bay (e.g. `77.6408`)

#### Response Example
```json
{
  "status": "ok",
  "provider": "OpenRoute / OpenStreetMap OSRM Engine",
  "origin": {
    "latitude": 12.9716,
    "longitude": 77.5946,
    "label": "Ambulance Grid GPS"
  },
  "destination": {
    "latitude": 12.9784,
    "longitude": 77.6408,
    "label": "Target Emergency Department"
  },
  "distance_km": 6.2,
  "duration_minutes": 8,
  "external_directions_url": "https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=12.9716%2C77.5946%3B12.9784%2C77.6408",
  "steps": [
    "Vittal Mallya Road",
    "Kasturba Road",
    "Mahatma Gandhi Road",
    "Central Street",
    "Cubbon Road",
    "Dickenson Road",
    "Swamy Vivekananda Road",
    "Chinmaya Mission Hospital Road",
    "100 Feet Road"
  ],
  "geometry": {
    "type": "LineString",
    "coordinates": [[77.594697, 12.971848], [77.59464, 12.971871], ...]
  }
}
```

### 2. Case-Specific OpenRoute Telemetry
* **Method**: `GET`
* **Route**: `/api/cases/{case_id}/open-route`
* **Access**: Scoped case access
* **Parameters**:
  * `hospital_id` *(optional)*: Specific hospital ID (defaults to confirmed destination or intended facility)

#### Behavior
1. Resolves destination hospital coordinates from the hospital registry.
2. Resolves latest reported GPS coordinates from `AmbulanceLocation` table. If location sharing is temporarily paused or unavailable, defaults to regional emergency dispatch hub coordinates (`12.9716, 77.5946`).
3. Computes OSRM routing with 2.0s timeout.
4. If upstream network is unreachable, smoothly falls back to Haversine emergency road network estimation (1.25x curvature factor, 35 km/h urban emergency transit speed with siren).

## Hospital Grid Coordinates

| Hospital ID | Facility Name | District / Hub | Coordinates |
|-------------|---------------|----------------|-------------|
| `HOSP-001` | Northbridge Apollo Heart & Trauma Hub | Indiranagar / Demo North | `12.9784, 77.6408` |
| `HOSP-002` | Riverbend Max Super Specialty | Outer Ring / Demo River | `12.9352, 77.6245` |
| `HOSP-003` | Cedar Fortis Children's Hospital | Demo East District | `12.9915, 77.6874` |
| `HOSP-004` | Harbor Metro Community Hospital | Demo West District | `12.9601, 77.5402` |

## Frontend Components

* **`AmbulanceTracker.tsx`**: Embeds live OpenStreetMap tile view and provides direct external link to turn-by-turn routing instructions.
* **`Coordination.tsx` (`SmartRoute`)**: Renders the **OpenRoute Telemetry & Transit Guidance** card displaying real-time distance, transit ETA, and corridor waypoints for active emergency transfers.
