# Ambulance location tracking

The case detail page supports explicit, browser-based GPS sharing for the paramedic who owns a case (or an administrator). The browser asks for location permission; it is never requested automatically.

When enabled, the client sends a location update at most once every eight seconds. Each update is validated, persisted to SQLite, associated with the case and sender, then emitted as an `ambulance.location_updated` WebSocket event. Authorized paramedic, coordinator, and eligible hospital users see the latest update after live delivery or event replay. Other hospitals cannot access the case or its location.

The map is an OpenStreetMap embed, with no API key or paid mapping dependency. An internet connection is needed to load map tiles. It displays awareness only; the application does not compute routes, traffic-aware ETAs, dispatch instructions, or clinical recommendations from location data.

API endpoint: `POST /api/cases/{case_id}/ambulance-location`

```json
{
  "latitude": 12.9716,
  "longitude": 77.5946,
  "accuracy_meters": 8.2,
  "speed_mps": 12.5,
  "heading_degrees": 90
}
```
