from datetime import timedelta
from .db import Base,engine,SessionLocal
from .models import Hospital,User,Resource,Case,Report
from .core import hash_password,utc

def seed(reset=False):
    if reset:Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.query(User).first():return
        hospitals=[
            Hospital(id='HOSP-001',name='Northbridge Apollo Heart & Trauma Hub',area='Indiranagar / Demo North District',capabilities=['general','trauma','cardiac'],readiness='ready',updated_at=utc()),
            Hospital(id='HOSP-002',name='Riverbend Max Super Specialty',area='Outer Ring / Demo River District',capabilities=['general','trauma','stroke','cardiac'],readiness='ready',updated_at=utc()),
            Hospital(id='HOSP-003',name="Cedar Fortis Children's Hospital",area='Demo East District',capabilities=['general','pediatric'],readiness='limited',constraint='Limited pediatric monitoring',updated_at=utc()),
            Hospital(id='HOSP-004',name='Harbor Metro Community Hospital',area='Demo West District',capabilities=['general'],readiness='ready',updated_at=utc()),
        ]
        db.add_all(hospitals)
        users=[('paramedic@ayustream.demo','Paramedic Vikram Rathore (BLS-108)','paramedic',None,'demo123'),('coordinator@ayustream.demo','Priya Nair (Central EMS Dispatch)','coordinator',None,'demo123'),('admin@ayustream.demo','Dr. Amitava Ghosh (Medical Director)','admin',None,'demo123'),('hospital1@ayustream.demo','Dr. Aditi Sen (Apollo ED Lead)','hospital','HOSP-001','demo123'),('hospital2@ayustream.demo','Dr. Rajesh Verma (Max Trauma Chief)','hospital','HOSP-002','demo123'),('paramedic','Paramedic Vikram Rathore (BLS-108)','paramedic',None,'demo1234'),('coordinator','Priya Nair (Central EMS Dispatch)','coordinator',None,'demo1234'),('admin','Dr. Amitava Ghosh (Medical Director)','admin',None,'demo1234'),('north','Dr. Aditi Sen (Apollo ED Lead)','hospital','HOSP-001','demo1234'),('river','Dr. Rajesh Verma (Max Trauma Chief)','hospital','HOSP-002','demo1234'),('cedar','Dr. Sneha Roy (Cedar Fortis ED)','hospital','HOSP-003','demo1234')]
        db.add_all([User(username=u,name=n,role=r,hospital_id=h,password_hash=hash_password(p)) for u,n,r,h,p in users])
        for hospital in hospitals:
            for i,typ in enumerate(['emergency_bed','emergency_bed','monitored_bed','ventilator'],1):
                db.add(Resource(id=f'{hospital.id}-R{i:02}',hospital_id=hospital.id,type=typ,state='available'))
        db.commit()

def synthetic_case():
    from .models import Case
    with SessionLocal() as db:
        c=db.query(Case).first()
        if c:return c.id
        creator=db.query(User).filter_by(username='paramedic@ayustream.demo').one()
        case=Case(id='AYU-DEMO-0001',patient_code='TMP-DEMO-0001',identity_mode='unknown',complaint='Synthetic report: chest pain',required_capabilities=['cardiac'],intended_hospital_id='HOSP-001',team='Demo Ambulance 07',eta_minutes=18,created_by=creator.id)
        db.add(case)
        report=Report(case_id=case.id,transcript='Synthetic demo: adult with chest pain, pulse 110 bpm and SPO2 94%. Other information unknown.',source='paramedic',provider='local-rule-based',created_by=creator.id,summary={'chief_complaint':'Synthetic demo: adult with chest pain','symptoms':['chest pain'],'vitals':{'heart_rate':'110 bpm','spo2':'94 %'},'history':[],'allergies':[],'medications':[],'interventions':[],'observations':[],'source':'paramedic','missing_fields':['history','allergies','medications','blood_pressure'],'uncertain_fields':[],'conflicting_fields':[],'evidence':{'heart_rate':'pulse 110 bpm','spo2':'SPO2 94%'},'processing_status':'extracted_needs_review','generated_at':utc().isoformat()})
        db.add(report);db.commit();return case.id
