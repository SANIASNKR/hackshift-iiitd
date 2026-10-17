import os
from datetime import timedelta
from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from .db import get_db
from .models import Case,Hospital,Acceptance,DestinationChange,Resource,ResourceAction
from .core import current_user,require,can_access_case,get_case_or_404,obj,record,utc
from .schemas import ReadinessIn,AcceptanceIn,ResponseIn,DestinationIn,ReserveIn
from .live import publish
router=APIRouter(prefix='/api',tags=['coordination'])
def stale(h):
    t=h.updated_at
    if not t:return True
    # SQLite may strip tzinfo: normalize timestamps before comparing.
    if t.tzinfo is None:t=t.replace(tzinfo=utc().tzinfo)
    return utc()-t>timedelta(minutes=int(os.getenv('HOSPITAL_STALE_MINUTES','30')))

def hospital_out(h):return {**obj(h),'stale':stale(h)}
@router.get('/hospitals')
def hospitals(user=Depends(current_user),db:Session=Depends(get_db)):
    return [hospital_out(h) for h in db.query(Hospital).order_by(Hospital.name).all()]
@router.patch('/hospitals/{hospital_id}/readiness')
async def readiness(hospital_id:str,data:ReadinessIn,user=Depends(require('hospital','admin')),db:Session=Depends(get_db)):
    h=db.get(Hospital,hospital_id)
    if not h:raise HTTPException(404,'Hospital not found')
    if user.role=='hospital' and user.hospital_id!=hospital_id:raise HTTPException(403,'Cannot edit another hospital')
    h.readiness=data.readiness;h.constraint=data.constraint;h.updated_at=utc()
    ev=record(db,'hospital.readiness_changed',user,hospital_id=h.id,payload={'readiness':h.readiness,'constraint':h.constraint})
    db.commit();await publish(ev);return hospital_out(h)

def match(case,db):
    result=[]
    for h in db.query(Hospital).all():
        missing=[x for x in case.required_capabilities if x not in h.capabilities]
        fresh=not stale(h)
        hard=bool(missing or h.readiness in ('unable','unreachable'))
        reasons=[]
        if missing:reasons.append('Missing required capability: '+', '.join(missing))
        else:reasons.append('All reported required capabilities are listed')
        if not fresh:reasons.append('Readiness information is stale and must be verified')
        if h.readiness!='ready':reasons.append('Reported readiness: '+h.readiness)
        else:reasons.append('Marked ready to assess; case acceptance is NOT confirmed')
        req=db.query(Acceptance).filter_by(case_id=case.id,hospital_id=h.id).order_by(Acceptance.created_at.desc()).first()
        result.append({'hospital':hospital_out(h),'eligible':not hard,'requires_confirmation':(not fresh or h.readiness!='ready'),'acceptance_status':req.status if req else 'not_requested','reasons':reasons,'score':int(not hard)*100+int(fresh)*20+int(h.readiness=='ready')*10-int(bool(missing))*50})
    return sorted(result,key=lambda x:x['score'],reverse=True)
@router.get('/cases/{case_id}/matches')
def matches(case_id:str,user=Depends(current_user),db:Session=Depends(get_db)):
    case=get_case_or_404(case_id,user,db)
    return {'case_id':case_id,'note':'Capability screening only, not a clinical recommendation or acceptance. No route time computed.','matches':match(case,db)}
@router.post('/cases/{case_id}/acceptances',status_code=201)
async def request_acceptance(case_id:str,data:AcceptanceIn,user=Depends(require('coordinator','admin')),db:Session=Depends(get_db)):
    case=get_case_or_404(case_id,user,db)
    h=db.get(Hospital,data.hospital_id)
    if not h:raise HTTPException(404,'Hospital not found')
    if any(c not in h.capabilities for c in case.required_capabilities) or h.readiness in ('unable','unreachable'):raise HTTPException(409,'Hospital does not currently satisfy minimum reported constraints')
    pending=db.query(Acceptance).filter_by(case_id=case_id,hospital_id=h.id,status='pending').first()
    if pending:raise HTTPException(409,'An acceptance request is already pending')
    req=Acceptance(case_id=case_id,hospital_id=h.id,created_by=user.id)
    db.add(req);db.flush();ev=record(db,'acceptance.requested',user,case_id=case_id,hospital_id=h.id,payload={'acceptance_id':req.id})
    db.commit();await publish(ev);return obj(req)
@router.post('/acceptances/{acceptance_id}/respond')
async def respond(acceptance_id:str,data:ResponseIn,user=Depends(require('hospital','admin')),db:Session=Depends(get_db)):
    req=db.get(Acceptance,acceptance_id)
    if not req:raise HTTPException(404,'Request not found')
    if user.role=='hospital' and user.hospital_id!=req.hospital_id:raise HTTPException(403,'Not addressed to your hospital')
    if req.status!='pending':raise HTTPException(409,'Request already answered')
    hospital=db.get(Hospital,req.hospital_id)
    if data.status=='accepted' and hospital.readiness in ('unable','unreachable'):raise HTTPException(409,'Hospital currently reports unable/unreachable')
    req.status=data.status;req.note=data.note;req.responded_by=user.id;req.responded_at=utc()
    ev=record(db,'acceptance.responded',user,case_id=req.case_id,hospital_id=req.hospital_id,payload={'acceptance_id':req.id,'status':req.status})
    db.commit();await publish(ev);return obj(req)
@router.post('/acceptances/{acceptance_id}/escalate')
async def escalate(acceptance_id:str,user=Depends(require('coordinator','admin')),db:Session=Depends(get_db)):
    req=db.get(Acceptance,acceptance_id)
    if not req:raise HTTPException(404,'Not found')
    if req.status!='pending':raise HTTPException(409,'Only pending requests can be escalated')
    req.escalated_at=utc()
    ev=record(db,'acceptance.escalated',user,case_id=req.case_id,hospital_id=req.hospital_id,payload={'acceptance_id':req.id,'manual':True})
    db.commit();await publish(ev);return obj(req)
@router.post('/cases/{case_id}/destination')
async def confirm_destination(case_id:str,data:DestinationIn,user=Depends(require('coordinator','admin')),db:Session=Depends(get_db)):
    case=get_case_or_404(case_id,user,db)
    req=db.get(Acceptance,data.acceptance_id)
    if not req or req.case_id!=case_id or req.status!='accepted':raise HTTPException(409,'Destination confirmation requires explicit acceptance for this case')
    if case.confirmed_hospital_id==req.hospital_id:raise HTTPException(409,'Destination already confirmed')
    old=case.confirmed_hospital_id or case.intended_hospital_id
    case.confirmed_hospital_id=req.hospital_id;case.updated_at=utc()
    db.add(DestinationChange(case_id=case.id,from_hospital_id=old,to_hospital_id=req.hospital_id,authorized_by=user.id,reason=data.reason))
    ev=record(db,'destination.confirmed',user,case_id=case_id,hospital_id=req.hospital_id,payload={'hospital_id':req.hospital_id,'previous_hospital_id':old})
    db.commit();await publish(ev);return obj(case)
@router.get('/resources')
def resources(user=Depends(current_user),db:Session=Depends(get_db),hospital_id:str|None=None):
    query=db.query(Resource)
    if user.role=='hospital':query=query.filter(Resource.hospital_id==user.hospital_id)
    elif hospital_id:query=query.filter(Resource.hospital_id==hospital_id)
    return [obj(r) for r in query.all()]
@router.post('/resources/{resource_id}/reserve')
async def reserve(resource_id:str,data:ReserveIn,user=Depends(require('hospital','admin')),db:Session=Depends(get_db)):
    from sqlalchemy import update
    resource=db.get(Resource,resource_id)
    if not resource:raise HTTPException(404,'Resource not found')
    if user.role=='hospital' and resource.hospital_id!=user.hospital_id:raise HTTPException(403,'Resource belongs to another hospital')
    case=get_case_or_404(data.case_id,user,db)
    result=db.execute(update(Resource).where(Resource.id==resource_id,Resource.state=='available').values(state='reserved',case_id=case.id,updated_at=utc()))
    if result.rowcount!=1:db.rollback();raise HTTPException(409,'Resource has already been reserved or is not available')
    db.add(ResourceAction(resource_id=resource_id,case_id=case.id,action='reserved',performed_by=user.id))
    ev=record(db,'resource.reserved',user,case_id=case.id,hospital_id=resource.hospital_id,payload={'resource_id':resource_id})
    db.commit();await publish(ev);db.refresh(resource);return obj(resource)
@router.post('/resources/{resource_id}/release')
async def release(resource_id:str,user=Depends(require('hospital','admin')),db:Session=Depends(get_db)):
    resource=db.get(Resource,resource_id)
    if not resource:raise HTTPException(404,'Not found')
    if user.role=='hospital' and resource.hospital_id!=user.hospital_id:raise HTTPException(403,'Not your resource')
    if resource.state not in ('reserved','occupied'):raise HTTPException(409,'Resource is not reserved or occupied')
    case_id=resource.case_id
    db.add(ResourceAction(resource_id=resource_id,case_id=case_id,action='released',performed_by=user.id))
    resource.state='available';resource.case_id=None;resource.updated_at=utc()
    ev=record(db,'resource.released',user,case_id=case_id,hospital_id=resource.hospital_id,payload={'resource_id':resource_id})
    db.commit();await publish(ev);return obj(resource)
