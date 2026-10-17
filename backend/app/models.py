from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import String, DateTime, Integer, ForeignKey, Boolean, JSON, Text, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

def utc(): return datetime.now(timezone.utc)
def uid(): return str(uuid4())

class User(Base):
    __tablename__='users'
    id:Mapped[str]=mapped_column(String,primary_key=True,default=uid)
    username:Mapped[str]=mapped_column(String,unique=True,index=True)
    password_hash:Mapped[str]=mapped_column(String)
    role:Mapped[str]=mapped_column(String)
    hospital_id:Mapped[str|None]=mapped_column(ForeignKey('hospitals.id'),nullable=True)
    name:Mapped[str]=mapped_column(String)

class Hospital(Base):
    __tablename__='hospitals'
    id:Mapped[str]=mapped_column(String,primary_key=True)
    name:Mapped[str]=mapped_column(String)
    area:Mapped[str]=mapped_column(String)
    capabilities:Mapped[list]=mapped_column(JSON,default=list)
    readiness:Mapped[str]=mapped_column(String,default='ready')
    constraint:Mapped[str|None]=mapped_column(String,nullable=True)
    updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utc)

class Case(Base):
    __tablename__='cases'
    id:Mapped[str]=mapped_column(String,primary_key=True)
    patient_code:Mapped[str]=mapped_column(String,unique=True)
    identity_mode:Mapped[str]=mapped_column(String)
    identity_name:Mapped[str|None]=mapped_column(String,nullable=True)
    identity_reviewed:Mapped[bool]=mapped_column(Boolean,default=False)
    age:Mapped[int|None]=mapped_column(Integer,nullable=True)
    sex:Mapped[str|None]=mapped_column(String,nullable=True)
    complaint:Mapped[str]=mapped_column(String,default='Not reported')
    required_capabilities:Mapped[list]=mapped_column(JSON,default=list)
    team:Mapped[str|None]=mapped_column(String,nullable=True)
    eta_minutes:Mapped[int|None]=mapped_column(Integer,nullable=True)
    intended_hospital_id:Mapped[str|None]=mapped_column(ForeignKey('hospitals.id'),nullable=True)
    confirmed_hospital_id:Mapped[str|None]=mapped_column(ForeignKey('hospitals.id'),nullable=True)
    status:Mapped[str]=mapped_column(String,default='active')
    created_by:Mapped[str]=mapped_column(ForeignKey('users.id'))
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utc)
    updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utc)

class Report(Base):
    __tablename__='reports'
    id:Mapped[str]=mapped_column(String,primary_key=True,default=uid)
    case_id:Mapped[str]=mapped_column(ForeignKey('cases.id'),index=True)
    transcript:Mapped[str]=mapped_column(Text)
    source:Mapped[str]=mapped_column(String,default='paramedic')
    provider:Mapped[str]=mapped_column(String,default='local')
    review_status:Mapped[str]=mapped_column(String,default='needs_review')
    summary:Mapped[dict]=mapped_column(JSON,default=dict)
    original_summary:Mapped[dict|None]=mapped_column(JSON,nullable=True)
    reviewed_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True)
    reviewed_by:Mapped[str|None]=mapped_column(ForeignKey('users.id'),nullable=True)
    created_by:Mapped[str]=mapped_column(ForeignKey('users.id'))
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utc)

class Observation(Base):
    __tablename__='observations'
    id:Mapped[str]=mapped_column(String,primary_key=True,default=uid)
    case_id:Mapped[str]=mapped_column(ForeignKey('cases.id'),index=True)
    field:Mapped[str]=mapped_column(String)
    value:Mapped[str]=mapped_column(String)
    unit:Mapped[str|None]=mapped_column(String,nullable=True)
    source:Mapped[str]=mapped_column(String,default='manual')
    verification:Mapped[str]=mapped_column(String,default='reported')
    created_by:Mapped[str]=mapped_column(ForeignKey('users.id'))
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utc)

class Conflict(Base):
    __tablename__='conflicts'
    id:Mapped[str]=mapped_column(String,primary_key=True,default=uid)
    case_id:Mapped[str]=mapped_column(ForeignKey('cases.id'),index=True)
    field:Mapped[str]=mapped_column(String)
    left_value:Mapped[str]=mapped_column(String)
    right_value:Mapped[str]=mapped_column(String)
    left_source:Mapped[str]=mapped_column(String)
    right_source:Mapped[str]=mapped_column(String)
    resolved:Mapped[bool]=mapped_column(Boolean,default=False)
    resolution:Mapped[str|None]=mapped_column(String,nullable=True)
    resolved_by:Mapped[str|None]=mapped_column(ForeignKey('users.id'),nullable=True)

class Acceptance(Base):
    __tablename__='acceptances'
    id:Mapped[str]=mapped_column(String,primary_key=True,default=uid)
    case_id:Mapped[str]=mapped_column(ForeignKey('cases.id'),index=True)
    hospital_id:Mapped[str]=mapped_column(ForeignKey('hospitals.id'))
    status:Mapped[str]=mapped_column(String,default='pending')
    note:Mapped[str|None]=mapped_column(String,nullable=True)
    created_by:Mapped[str]=mapped_column(ForeignKey('users.id'))
    responded_by:Mapped[str|None]=mapped_column(ForeignKey('users.id'),nullable=True)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utc)
    responded_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True)
    escalated_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True)

class DestinationChange(Base):
    __tablename__='destination_changes'
    id:Mapped[str]=mapped_column(String,primary_key=True,default=uid)
    case_id:Mapped[str]=mapped_column(ForeignKey('cases.id'))
    from_hospital_id:Mapped[str|None]=mapped_column(ForeignKey('hospitals.id'),nullable=True)
    to_hospital_id:Mapped[str]=mapped_column(ForeignKey('hospitals.id'))
    authorized_by:Mapped[str]=mapped_column(ForeignKey('users.id'))
    reason:Mapped[str]=mapped_column(String)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utc)

class Resource(Base):
    __tablename__='resources'
    id:Mapped[str]=mapped_column(String,primary_key=True)
    hospital_id:Mapped[str]=mapped_column(ForeignKey('hospitals.id'))
    type:Mapped[str]=mapped_column(String)
    state:Mapped[str]=mapped_column(String,default='available')
    case_id:Mapped[str|None]=mapped_column(ForeignKey('cases.id'),nullable=True)
    updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utc)

class ResourceAction(Base):
    __tablename__='resource_actions'
    id:Mapped[str]=mapped_column(String,primary_key=True,default=uid)
    resource_id:Mapped[str]=mapped_column(ForeignKey('resources.id'))
    case_id:Mapped[str|None]=mapped_column(ForeignKey('cases.id'),nullable=True)
    action:Mapped[str]=mapped_column(String)
    performed_by:Mapped[str]=mapped_column(ForeignKey('users.id'))
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utc)

class AmbulanceLocation(Base):
    """A deliberately small, append-only location history for a single case.

    Location is operational data, never used to select a destination or calculate
    a clinical recommendation.
    """
    __tablename__='ambulance_locations'
    id:Mapped[str]=mapped_column(String,primary_key=True,default=uid)
    case_id:Mapped[str]=mapped_column(ForeignKey('cases.id'),index=True)
    latitude:Mapped[float]=mapped_column()
    longitude:Mapped[float]=mapped_column()
    accuracy_meters:Mapped[float|None]=mapped_column(nullable=True)
    speed_mps:Mapped[float|None]=mapped_column(nullable=True)
    heading_degrees:Mapped[float|None]=mapped_column(nullable=True)
    reported_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utc,index=True)
    created_by:Mapped[str]=mapped_column(ForeignKey('users.id'))

Index('ix_ambulance_location_case_reported',AmbulanceLocation.case_id,AmbulanceLocation.reported_at)

class Event(Base):
    __tablename__='events'
    sequence:Mapped[int]=mapped_column(Integer,primary_key=True,autoincrement=True)
    id:Mapped[str]=mapped_column(String,unique=True,default=uid)
    event_type:Mapped[str]=mapped_column(String,index=True)
    case_id:Mapped[str|None]=mapped_column(ForeignKey('cases.id'),nullable=True,index=True)
    hospital_id:Mapped[str|None]=mapped_column(ForeignKey('hospitals.id'),nullable=True,index=True)
    actor_id:Mapped[str]=mapped_column(ForeignKey('users.id'))
    payload:Mapped[dict]=mapped_column(JSON,default=dict)
    occurred_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utc)

class Ack(Base):
    __tablename__='acks'
    id:Mapped[str]=mapped_column(String,primary_key=True,default=uid)
    event_id:Mapped[str]=mapped_column(ForeignKey('events.id'))
    user_id:Mapped[str]=mapped_column(ForeignKey('users.id'))
    received_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utc)
    __table_args__=(UniqueConstraint('event_id','user_id',name='uq_ack_user_event'),)

Index('ix_acceptance_status_created',Acceptance.status,Acceptance.created_at)
