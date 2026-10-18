import pytest
from app.routes_coordination import haversine_km, HOSPITAL_COORDINATES, compute_open_route

def test_haversine_distance_calculation():
    # Distance between Indiranagar (12.9784, 77.6408) and Koramangala (12.9352, 77.6245) is ~5.1 km
    dist = haversine_km(12.9784, 77.6408, 12.9352, 77.6245)
    assert 4.5 < dist < 6.0
    # Distance to identical point is 0
    assert haversine_km(12.9716, 77.5946, 12.9716, 77.5946) == 0.0

def test_hospital_grid_registry():
    assert 'HOSP-001' in HOSPITAL_COORDINATES
    assert 'HOSP-002' in HOSPITAL_COORDINATES
    assert 'HOSP-003' in HOSPITAL_COORDINATES
    assert 'HOSP-004' in HOSPITAL_COORDINATES

    for hid, coords in HOSPITAL_COORDINATES.items():
        assert -90 <= coords['lat'] <= 90
        assert -180 <= coords['lon'] <= 180
        assert len(coords['name']) > 5

@pytest.mark.anyio
async def test_compute_open_route_fallback_and_structure():
    route = await compute_open_route(12.9716, 77.5946, 12.9784, 77.6408)
    assert route['distance_km'] > 0
    assert route['duration_minutes'] > 0
    assert 'openstreetmap.org/directions' in route['external_directions_url']
    assert isinstance(route['steps'], list)
    assert len(route['steps']) > 0

def test_routes_open_route_api_endpoints(client, login):
    coord = login(client, 'coordinator')
    # Valid coordinates request
    res = client.get('/api/routes/open-route?origin_lat=12.9716&origin_lon=77.5946&dest_lat=12.9352&dest_lon=77.6245', headers=coord)
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'ok'
    assert data['origin']['latitude'] == 12.9716
    assert data['destination']['latitude'] == 12.9352
    assert data['distance_km'] > 0
    assert data['duration_minutes'] > 0
