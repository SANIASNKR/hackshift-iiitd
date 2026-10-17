from pydantic import BaseModel,Field
from typing import Literal
class Login(BaseModel):
    username:str
    password:str
class NewCase(BaseModel):
    identity_mode:Literal['unknown','bystander','document']='unknown'
    identity_name:str|None=Field(default=None,max_length=140)
    age:int|None=Field(default=None,ge=0,le=125)
    sex:str|None=Field(default=None,max_length=40)
    complaint:str=Field(default='Not reported',max_length=400)
    team:str|None=Field(default=None,max_length=90)
    eta_minutes:int|None=Field(default=None,ge=0,le=1000)
    required_capabilities:list[str]=Field(default_factory=list,max_length=20)
    intended_hospital_id:str|None=None
class CasePatch(BaseModel):
    identity_name:str|None=None
    identity_reviewed:bool|None=None
    age:int|None=Field(default=None,ge=0,le=125)
    eta_minutes:int|None=Field(default=None,ge=0,le=1000)
    status:Literal['active','closed']|None=None
class ReportIn(BaseModel):
    transcript:str=Field(min_length=3,max_length=10000)
    source:Literal['paramedic','bystander','hospital','manual']='paramedic'
class ObservationIn(BaseModel):
    field:str=Field(min_length=1,max_length=80)
    value:str=Field(min_length=1,max_length=120)
    unit:str|None=Field(default=None,max_length=24)
class ReadinessIn(BaseModel):
    readiness:Literal['ready','limited','unable','awaiting','unreachable']
    constraint:str|None=Field(default=None,max_length=500)
class AcceptanceIn(BaseModel):
    hospital_id:str
class ResponseIn(BaseModel):
    status:Literal['accepted','declined']
    note:str|None=Field(default=None,max_length=400)
class DestinationIn(BaseModel):
    acceptance_id:str
    reason:str=Field(min_length=3,max_length=400)
class ConflictResolution(BaseModel):
    resolution:str=Field(min_length=2,max_length=400)
class ReserveIn(BaseModel):
    case_id:str
class ScenarioIn(BaseModel):
    scenario:Literal['hospital_unable','no_response','clinical_conflict','ai_unavailable','stale_readiness','resource_race']

class RadioDispatchIn(BaseModel):
    message:str=Field(min_length=2,max_length=1000)
    channel:str=Field(default='Priority EMS-108')
    language:Literal['hinglish','hindi','english']='hinglish'
    audio_simulated:bool=True
    urgency:Literal['routine','priority','immediate_critical']='priority'

class DoctorDirectiveIn(BaseModel):
    directive:str=Field(min_length=2,max_length=1000)
    priority:Literal['standard','urgent','stat']='urgent'
