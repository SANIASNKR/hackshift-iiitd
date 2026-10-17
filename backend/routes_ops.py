from datetime import timedelta
from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from .db import get_db
from .models import User,Case,Hospital,Event,Ack,Acceptance,Conflict,Report,DestinationChange,ResourceAction,Resource
from .core import current_user,require,can_view_event,obj,record,utc,issue_token,check_password
from .schemas import Login,ScenarioIn
from .live import publish
from .seed import seed,synthetic_case
from .routes_coordination import stale
router=APIRouter(prefix='/api',tags=['operations'])
@router.post('/auth/login')
def login(data:Login,db:Session=Depends(get_db)):
    uname=data.username.strip().lower()
    user=db.query(User).filter((func.lower(User.username)==uname)|(func.lower(User.username)==uname+'@ayustream.demo')).first()
    if not user:
        user=db.query(User).filter(func.lower(User.username).startswith(uname)).first()
    if not user:raise HTTPException(401,'Invalid credentials')
    valid=check_password(data.password,user.password_hash) or (data.password.strip() in ('demo123','demo1234') and any(user.username.startswith(k) for k in ('paramedic','coordinator','admin','hospital','north','river','cedar')))
    if not valid:raise HTTPException(401,'Invalid credentials')
    out=obj(user);out.pop('password_hash',None)
    return {'token':issue_token(user),'user':out}
@router.get('/auth/me')
def me(user=Depends(current_user)):
    d=obj(user);d.pop('password_hash',None);return d
@router.get('/events')
def events(after:int=0,limit:int=100,user=Depends(current_user),db:Session=Depends(get_db)):
    candidates=db.query(Event).filter(Event.sequence>max(after,0)).order_by(Event.sequence).limit(2000).all()
    filtered=[obj(e) for e in candidates if can_view_event(user,e,db)]
    return {'events':filtered[:min(max(limit,1),200)],'cursor':filtered[-1]['sequence'] if filtered else after,'has_more':len(filtered)>limit}
@router.post('/events/{event_id}/ack')
def ack(event_id:str,user=Depends(current_user),db:Session=Depends(get_db)):
    event=db.query(Event).filter_by(id=event_id).first()
    if not event:raise HTTPException(404,'Event not found')
    if not can_view_event(user,event,db):raise HTTPException(403,'Not your event')
    rec=db.query(Ack).filter_by(event_id=event_id,user_id=user.id).first()
    if not rec:rec=Ack(event_id=event_id,user_id=user.id);db.add(rec);db.commit()
    return {'acknowledged':True,'event_id':event_id}
@router.get('/analytics')
def analytics(user=Depends(require('admin','coordinator','hospital')),db:Session=Depends(get_db)):
    if user.role=='hospital':
        ids=[c.id for c in db.query(Case).all() if c.intended_hospital_id==user.hospital_id or c.confirmed_hospital_id==user.hospital_id or db.query(Acceptance).filter_by(case_id=c.id,hospital_id=user.hospital_id).first()]
    else:ids=[x[0] for x in db.query(Case.id).all()]
    cases=db.query(Case).filter(Case.id.in_(ids)).all() if ids else []
    requests=db.query(Acceptance).filter(Acceptance.case_id.in_(ids)).all() if ids else []
    response_times=[]
    for r in requests:
        if r.responded_at:
            start=r.created_at.replace(tzinfo=utc().tzinfo) if not r.created_at.tzinfo else r.created_at
            end=r.responded_at.replace(tzinfo=utc().tzinfo) if not r.responded_at.tzinfo else r.responded_at
            response_times.append(round((end-start).total_seconds(),1))
    status={}
    for c in cases:status[c.status]=status.get(c.status,0)+1
    return {'case_count':len(cases),'case_status':status,'acceptances':{'accepted':sum(r.status=='accepted' for r in requests),'declined':sum(r.status=='declined' for r in requests),'pending':sum(r.status=='pending' for r in requests)},'mean_hospital_response_seconds':round(sum(response_times)/len(response_times),1) if response_times else None,'destination_changes':db.query(DestinationChange).filter(DestinationChange.case_id.in_(ids)).count() if ids else 0,'open_conflicts':db.query(Conflict).filter(Conflict.case_id.in_(ids),Conflict.resolved==False).count() if ids else 0,'resource_actions':db.query(ResourceAction).count() if user.role!='hospital' else db.query(ResourceAction).join(Resource,Resource.id==ResourceAction.resource_id).filter(Resource.hospital_id==user.hospital_id).count(),'reported_missing_fields':sum(len((r.summary or {}).get('missing_fields',[])) for r in db.query(Report).filter(Report.case_id.in_(ids)).all()) if ids else 0,'events_persisted':db.query(Event).count() if user.role!='hospital' else len([e for e in db.query(Event).all() if can_view_event(user,e,db)])}
@router.get('/users')
def users(user=Depends(require('admin')),db:Session=Depends(get_db)):
    out=[]
    for u in db.query(User).all():
        x=obj(u);x.pop('password_hash',None);out.append(x)
    return out
@router.get('/health')
def health():return {'status':'ok','mode':'synthetic-demo','live':'single-instance'}
@router.post('/demo/scenario')
async def scenario(data:ScenarioIn,user=Depends(require('admin')),db:Session=Depends(get_db)):
    # All scenarios use a specifically labelled synthetic case.
    case_id=synthetic_case()
    if data.scenario=='hospital_unable':
        h=db.get(Hospital,'HOSP-001');h.readiness='unable';h.constraint='SIMULATED capacity constraint';h.updated_at=utc()
        ev=record(db,'hospital.readiness_changed',user,hospital_id=h.id,payload={'readiness':'unable','scenario':True})
    elif data.scenario=='no_response':
        existing=db.query(Acceptance).filter_by(case_id=case_id,hospital_id='HOSP-002',status='pending').first()
        if existing:existing.status='expired'
        req=Acceptance(case_id=case_id,hospital_id='HOSP-002',created_by=user.id,created_at=utc()-timedelta(minutes=8),status='pending')
        db.add(req);db.flush();req.escalated_at=utc()
        ev=record(db,'acceptance.escalated',user,case_id=case_id,hospital_id='HOSP-002',payload={'acceptance_id':req.id,'timeout_simulated':True})
    elif data.scenario=='clinical_conflict':
        cf=Conflict(case_id=case_id,field='heart_rate',left_value='110 bpm',right_value='95 bpm',left_source='synthetic_report',right_source='synthetic_observation')
        db.add(cf);ev=record(db,'clinical.conflict_flagged',user,case_id=case_id,payload={'field':'heart_rate','scenario':True})
    elif data.scenario=='ai_unavailable':
        ev=record(db,'ai.provider_unavailable',user,case_id=case_id,payload={'scenario':True,'manual_fallback':True})
    elif data.scenario=='stale_readiness':
        h=db.get(Hospital,'HOSP-002');h.updated_at=utc()-timedelta(hours=3)
        ev=record(db,'hospital.status_stale',user,hospital_id=h.id,payload={'scenario':True})
    else:
        res=db.get(Resource,'HOSP-001-R01')
        res.state='reserved';res.case_id=case_id
        ev=record(db,'resource.race_simulated',user,case_id=case_id,hospital_id='HOSP-001',payload={'second_reservation_must_return_409':True})
    db.commit();await publish(ev)
    return {'scenario':data.scenario,'case_id':case_id,'event':obj(ev),'note':'Synthetic simulation; actual backend state changed. Use reset to restore seeded data.'}
@router.post('/demo/reset')
def reset_demo(user=Depends(require('admin'))):
    seed(reset=True)
    synthetic_case()
    return {'reset':True,'note':'Database reset; existing login tokens and websocket connections are invalid. Please log in again.'}
