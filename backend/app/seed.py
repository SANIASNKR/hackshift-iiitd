from datetime import timedelta

from .core import hash_password, utc
from .db import Base, SessionLocal, engine
from .models import (
    Acceptance,
    Case,
    Conflict,
    DestinationChange,
    Hospital,
    Observation,
    Report,
    Resource,
    ResourceAction,
    User,
)


def _summary(
    complaint,
    symptoms,
    vitals,
    *,
    history=None,
    allergies=None,
    medications=None,
    missing_fields=None,
    processing_status="extracted_needs_review",
):
    return {
        "chief_complaint": complaint,
        "symptoms": symptoms,
        "vitals": vitals,
        "history": history or [],
        "allergies": allergies or [],
        "medications": medications or [],
        "interventions": [],
        "observations": [],
        "source": "paramedic",
        "missing_fields": missing_fields or [],
        "uncertain_fields": [],
        "conflicting_fields": [],
        "evidence": {},
        "processing_status": processing_status,
        "generated_at": utc().isoformat(),
    }


def seed(reset=False):
    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.query(User).first():
            return

        hospitals = [
            Hospital(
                id="HOSP-001",
                name="Northbridge Apollo Heart & Trauma Hub",
                area="Indiranagar / Demo North District",
                capabilities=["general", "trauma", "cardiac"],
                readiness="ready",
                updated_at=utc(),
            ),
            Hospital(
                id="HOSP-002",
                name="Riverbend Max Super Specialty",
                area="Outer Ring / Demo River District",
                capabilities=["general", "trauma", "stroke", "cardiac"],
                readiness="ready",
                updated_at=utc(),
            ),
            Hospital(
                id="HOSP-003",
                name="Cedar Fortis Children's Hospital",
                area="Demo East District",
                capabilities=["general", "pediatric"],
                readiness="limited",
                constraint="Limited pediatric monitoring",
                updated_at=utc(),
            ),
            Hospital(
                id="HOSP-004",
                name="Harbor Metro Community Hospital",
                area="Demo West District",
                capabilities=["general"],
                readiness="ready",
                updated_at=utc(),
            ),
        ]
        db.add_all(hospitals)

        users = [
            ("paramedic@ayustream.demo", "Paramedic Vikram Rathore (BLS-108)", "paramedic", None, "demo123"),
            ("coordinator@ayustream.demo", "Priya Nair (Central EMS Dispatch)", "coordinator", None, "demo123"),
            ("admin@ayustream.demo", "Dr. Amitava Ghosh (Medical Director)", "admin", None, "demo123"),
            ("hospital1@ayustream.demo", "Dr. Aditi Sen (Apollo ED Lead)", "hospital", "HOSP-001", "demo123"),
            ("hospital2@ayustream.demo", "Dr. Rajesh Verma (Max Trauma Chief)", "hospital", "HOSP-002", "demo123"),
            ("paramedic", "Paramedic Vikram Rathore (BLS-108)", "paramedic", None, "demo1234"),
            ("coordinator", "Priya Nair (Central EMS Dispatch)", "coordinator", None, "demo1234"),
            ("admin", "Dr. Amitava Ghosh (Medical Director)", "admin", None, "demo1234"),
            ("north", "Dr. Aditi Sen (Apollo ED Lead)", "hospital", "HOSP-001", "demo1234"),
            ("river", "Dr. Rajesh Verma (Max Trauma Chief)", "hospital", "HOSP-002", "demo1234"),
            ("cedar", "Dr. Sneha Roy (Cedar Fortis ED)", "hospital", "HOSP-003", "demo1234"),
        ]
        db.add_all(
            [
                User(
                    username=username,
                    name=name,
                    role=role,
                    hospital_id=hospital_id,
                    password_hash=hash_password(password),
                )
                for username, name, role, hospital_id, password in users
            ]
        )
        db.flush()

        for hospital in hospitals:
            for i, resource_type in enumerate(
                ["emergency_bed", "emergency_bed", "monitored_bed", "ventilator"], 1
            ):
                db.add(
                    Resource(
                        id=f"{hospital.id}-R{i:02}",
                        hospital_id=hospital.id,
                        type=resource_type,
                        state="available",
                    )
                )

        paramedic = db.query(User).filter_by(username="paramedic").one()
        coordinator = db.query(User).filter_by(username="coordinator").one()
        north = db.query(User).filter_by(username="north").one()
        river = db.query(User).filter_by(username="river").one()
        now = utc()

        cases = [
            Case(
                id="AYU-DEMO-0001",
                patient_code="TMP-DEMO-0001",
                identity_mode="unknown",
                age=58,
                sex="male",
                complaint="Synthetic report: chest pain and breathlessness",
                required_capabilities=["cardiac"],
                intended_hospital_id="HOSP-001",
                confirmed_hospital_id="HOSP-002",
                team="BLS-108 · Unit 07",
                eta_minutes=12,
                created_by=paramedic.id,
                created_at=now - timedelta(minutes=38),
                updated_at=now - timedelta(minutes=3),
            ),
            Case(
                id="AYU-DEMO-0002",
                patient_code="TMP-DEMO-0002",
                identity_mode="bystander",
                identity_name="Meera (name reported by family)",
                identity_reviewed=False,
                age=34,
                sex="female",
                complaint="Synthetic report: fall with suspected wrist injury",
                required_capabilities=["trauma"],
                intended_hospital_id="HOSP-001",
                team="BLS-112 · Unit 03",
                eta_minutes=24,
                created_by=paramedic.id,
                created_at=now - timedelta(minutes=21),
                updated_at=now - timedelta(minutes=8),
            ),
            Case(
                id="AYU-DEMO-0003",
                patient_code="TMP-DEMO-0003",
                identity_mode="document",
                identity_name="Arjun Mehta",
                identity_reviewed=True,
                age=9,
                sex="male",
                complaint="Synthetic report: fever and dehydration",
                required_capabilities=["pediatric"],
                intended_hospital_id="HOSP-003",
                confirmed_hospital_id="HOSP-003",
                team="BLS-104 · Unit 11",
                eta_minutes=0,
                status="closed",
                created_by=paramedic.id,
                created_at=now - timedelta(hours=2, minutes=10),
                updated_at=now - timedelta(hours=1, minutes=24),
            ),
        ]
        db.add_all(cases)
        db.flush()

        db.add_all(
            [
                Report(
                    case_id="AYU-DEMO-0001",
                    transcript="Synthetic patient reports central chest pain and mild breathlessness for 20 minutes. Pulse 110 bpm, SpO2 94%, BP 132/86. No medication or allergy history available.",
                    source="paramedic",
                    provider="local-rule-based",
                    summary=_summary(
                        "Chest pain and breathlessness",
                        ["central chest pain", "mild breathlessness"],
                        {"heart_rate": "110 bpm", "spo2": "94 %", "blood_pressure": "132/86 mmHg"},
                        missing_fields=["allergies", "medications"],
                    ),
                    created_by=paramedic.id,
                    created_at=now - timedelta(minutes=34),
                ),
                Report(
                    case_id="AYU-DEMO-0002",
                    transcript="Synthetic patient fell on an outstretched hand. Wrist pain and swelling reported. Pulse 88 bpm, SpO2 98%. No loss of consciousness reported.",
                    source="paramedic",
                    provider="local-rule-based",
                    review_status="reviewed",
                    summary=_summary(
                        "Fall with wrist injury",
                        ["wrist pain", "wrist swelling"],
                        {"heart_rate": "88 bpm", "spo2": "98 %"},
                        history=["No loss of consciousness reported"],
                        missing_fields=["allergies", "medications", "blood_pressure"],
                        processing_status="reviewed",
                    ),
                    created_by=paramedic.id,
                    created_at=now - timedelta(minutes=18),
                ),
                Report(
                    case_id="AYU-DEMO-0003",
                    transcript="Synthetic child with fever since yesterday and reduced oral intake. Pulse 118 bpm, temperature 39.1 C. Guardian reports no known allergies.",
                    source="paramedic",
                    provider="local-rule-based",
                    review_status="reviewed",
                    summary=_summary(
                        "Fever and dehydration",
                        ["fever", "reduced oral intake"],
                        {"heart_rate": "118 bpm", "temperature": "39.1 C"},
                        allergies=["No known allergies reported"],
                        missing_fields=["medications", "blood_pressure"],
                        processing_status="reviewed",
                    ),
                    created_by=paramedic.id,
                    created_at=now - timedelta(hours=2),
                ),
            ]
        )
        db.add_all(
            [
                Observation(
                    case_id="AYU-DEMO-0001",
                    field="heart_rate",
                    value="108",
                    unit="bpm",
                    source="monitor",
                    verification="reported",
                    created_by=paramedic.id,
                    created_at=now - timedelta(minutes=16),
                ),
                Observation(
                    case_id="AYU-DEMO-0002",
                    field="pain_score",
                    value="7",
                    unit="/10",
                    source="manual",
                    verification="reported",
                    created_by=paramedic.id,
                    created_at=now - timedelta(minutes=14),
                ),
                Observation(
                    case_id="AYU-DEMO-0003",
                    field="temperature",
                    value="39.1",
                    unit="C",
                    source="thermometer",
                    verification="verified",
                    created_by=paramedic.id,
                    created_at=now - timedelta(hours=1, minutes=48),
                ),
            ]
        )
        db.add(
            Conflict(
                case_id="AYU-DEMO-0001",
                field="heart_rate",
                left_value="110 bpm",
                right_value="108 bpm",
                left_source="synthetic_report",
                right_source="monitor_observation",
                resolved=False,
            )
        )

        accepted = Acceptance(
            case_id="AYU-DEMO-0001",
            hospital_id="HOSP-002",
            status="accepted",
            note="Cardiac bay available; bring directly to monitored intake.",
            created_by=coordinator.id,
            responded_by=river.id,
            created_at=now - timedelta(minutes=29),
            responded_at=now - timedelta(minutes=26),
        )
        declined = Acceptance(
            case_id="AYU-DEMO-0001",
            hospital_id="HOSP-001",
            status="declined",
            note="Simulated cardiac capacity constraint.",
            created_by=coordinator.id,
            responded_by=north.id,
            created_at=now - timedelta(minutes=31),
            responded_at=now - timedelta(minutes=30),
        )
        pending = Acceptance(
            case_id="AYU-DEMO-0002",
            hospital_id="HOSP-001",
            status="pending",
            created_by=coordinator.id,
            created_at=now - timedelta(minutes=7),
        )
        db.add_all([accepted, declined, pending])
        db.flush()
        db.add(
            DestinationChange(
                case_id="AYU-DEMO-0001",
                from_hospital_id="HOSP-001",
                to_hospital_id="HOSP-002",
                authorized_by=coordinator.id,
                reason="Northbridge declined simulated cardiac intake; Riverbend explicitly accepted.",
                created_at=now - timedelta(minutes=24),
            )
        )

        reserved = db.get(Resource, "HOSP-002-R03")
        reserved.state = "reserved"
        reserved.case_id = "AYU-DEMO-0001"
        reserved.updated_at = now - timedelta(minutes=20)
        db.add(
            ResourceAction(
                resource_id=reserved.id,
                case_id="AYU-DEMO-0001",
                action="reserved",
                performed_by=river.id,
                created_at=now - timedelta(minutes=20),
            )
        )

        db.commit()


def synthetic_case():
    with SessionLocal() as db:
        case = db.get(Case, "AYU-DEMO-0001")
        if case:
            return case.id
        seed()
        return "AYU-DEMO-0001"
