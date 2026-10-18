#!/usr/bin/env python3
"""
AyuStream AI — System Integrity & Verification Test Tool
Verifies backend configuration, database tables, OpenRoute algorithms,
and frontend production builds.
"""

import sys
import os
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def check_backend_integrity():
    print("[1/4] Checking Backend & Database...")
    sys.path.insert(0, str(ROOT / "backend"))
    from app.db import SessionLocal, engine
    from app.models import Base, User, Hospital, Case
    from app.routes_coordination import haversine_km, HOSPITAL_COORDINATES

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        user_count = db.query(User).count()
        hosp_count = db.query(Hospital).count()
        case_count = db.query(Case).count()

    print(f"      Users: {user_count}, Hospitals: {hosp_count}, Cases: {case_count}")
    assert user_count >= 5, "Database seed users missing"
    assert hosp_count >= 4, "Hospital registries missing"
    print("      ✓ Backend & Database healthy")

def check_openroute_algorithms():
    print("[2/4] Checking OpenRoute Algorithms...")
    from app.routes_coordination import haversine_km, HOSPITAL_COORDINATES

    # Distance test
    dist = haversine_km(12.9716, 77.5946, 12.9784, 77.6408)
    assert 4.0 <= dist <= 6.5, f"Haversine calculation unexpected: {dist}"
    print(f"      Indiranagar Grid Distance: {dist} km")

    # Verify hospital coordinates registry
    for hid in ['HOSP-001', 'HOSP-002', 'HOSP-003', 'HOSP-004']:
        assert hid in HOSPITAL_COORDINATES, f"Missing {hid}"
    print("      ✓ OpenRoute engine algorithms validated")

def check_frontend_bundle():
    print("[3/4] Checking Frontend Assets...")
    dist = ROOT / "frontend" / "dist"
    index_html = dist / "index.html"
    if index_html.exists():
        print(f"      ✓ Production bundle located at {dist}")
    else:
        print("      ℹ Production bundle not built yet (run 'npm run build' in frontend)")

def main():
    print("==================================================")
    print("AyuStream AI — End-to-End System Health Check")
    print("==================================================")
    try:
        check_backend_integrity()
        check_openroute_algorithms()
        check_frontend_bundle()
        print("==================================================")
        print("✓ All system verification checks passed successfully!")
        print("==================================================")
    except Exception as e:
        print(f"\n[ERROR] System check failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
