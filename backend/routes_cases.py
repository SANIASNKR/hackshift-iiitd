from datetime import datetime
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import desc
from .db import get_db
from .models import Case, Report, Observation, Conflict, Acceptance, DestinationChange, Event, Hospital
from .core import current_user,require,get_case_or_404,can_access_case,obj,record,utc
from .schemas import NewCase,CasePatch,ReportIn,ObservationIn,ConflictResolution,RadioDispatchIn,DoctorDirectiveIn
from .ai import extract,transcribe,ClinicalSummary
from .live import publish

router=APIRouter(prefix='/api/cases',tags=['cases'])
@router.get('')
def list_cases(user=Depends(current_user),db:Session=Depends(get_db),q:str='',limit:int=50,offset:int=0):
    all_cases=db.query(Case).order_by(desc(Case.updated_at)).all()
    selected=[c for c in all_cases if can_access_case(user,c,db) and (not q or q.lower() in (c.id+' '+c.complaint).lower())]
    return {'items':[obj(c) for c in selected[max(0,offset):max(0,offset)+min(max(limit,1),100)]],'total':len(selected)}
@router.post('',status_code=201)
async def create_case(data:NewCase,user=Depends(require('paramedic','coordinator','admin')),db:Session=Depends(get_db)):
    if data.intended_hospital_id and not db.get(Hospital,data.intended_hospital_id):raise HTTPException(422,'Unknown hospital')
    case_id='AYU-'+str(utc().year)+'-'+uuid4().hex[:10].upper()
    case=Case(id=case_id,patient_code='TMP-'+uuid4().hex[:10].upper(),created_by=user.id,**data.model_dump())
    db.add(case);ev=record(db,'case.created',user,case_id=case_id,hospital_id=case.intended_hospital_id,payload={'identity_mode':case.identity_mode})
    db.commit();await publish(ev)
    return obj(case)
@router.get('/{case_id}')
def details(case_id:str,user=Depends(current_user),db:Session=Depends(get_db)):
    case=get_case_or_404(case_id,user,db)
    def items(model):return [obj(x) for x in db.query(model).filter_by(case_id=case_id).all()]
    return {'case':obj(case),'reports':items(Report),'observations':items(Observation),'conflicts':items(Conflict),'acceptances':items(Acceptance),'destination_history':items(DestinationChange),'events':[obj(x) for x in db.query(Event).filter_by(case_id=case_id).order_by(Event.sequence.desc()).limit(100).all()]}
@router.patch('/{case_id}')
async def update_case(case_id:str,data:CasePatch,user=Depends(require('paramedic','coordinator','admin')),db:Session=Depends(get_db)):
    case=get_case_or_404(case_id,user,db)
    changes=data.model_dump(exclude_unset=True)
    if data.status=='closed' and user.role=='paramedic':raise HTTPException(403,'Coordinator or admin must close a case')
    for k,v in changes.items():setattr(case,k,v)
    case.updated_at=utc();ev=record(db,'case.updated',user,case_id=case_id,payload={'updated_fields':list(changes)})
    db.commit();await publish(ev);return obj(case)
@router.post('/{case_id}/reports',status_code=201)
async def submit_report(case_id:str,data:ReportIn,user=Depends(require('paramedic','coordinator','admin')),db:Session=Depends(get_db)):
    case=get_case_or_404(case_id,user,db)
    report=Report(case_id=case_id,transcript=data.transcript,source=data.source,created_by=user.id,summary={},review_status='processing')
    db.add(report);db.commit()
    try:
        summary,provider=await extract(data.transcript,data.source)
        report.summary=summary.model_dump();report.provider=provider;report.review_status='needs_review'
        if case.complaint=='Not reported':case.complaint=summary.chief_complaint or 'Not reported'
        event_type='clinical.report_extracted'
    except Exception:
        report.review_status='failed';report.provider='failed';db.commit()
        raise
    case.updated_at=utc();ev=record(db,event_type,user,case_id=case_id,payload={'report_id':report.id,'review_status':report.review_status})
    db.commit();await publish(ev);return obj(report)
@router.post('/{case_id}/audio')
async def audio_report(case_id:str,file:UploadFile=File(...),user=Depends(require('paramedic','coordinator','admin')),db:Session=Depends(get_db)):
    get_case_or_404(case_id,user,db)
    supported={'audio/webm','audio/wav','audio/x-wav','audio/mpeg','audio/mp4','audio/ogg','audio/mp3'}
    if file.content_type not in supported:raise HTTPException(415,'Unsupported audio content type')
    content=await file.read(10*1024*1024+1)
    if not content or len(content)>10*1024*1024:raise HTTPException(413,'Empty or oversized audio file (limit: 10 MB)')
    transcript=await transcribe(content,file.filename or 'recording.webm',file.content_type)
    return {'transcript':transcript,'stored_audio':False,'requires_review':True}
@router.post('/identity/ocr')
async def ocr_document(file:UploadFile=File(...),user=Depends(require('paramedic','admin','coordinator'))):
    if file.content_type not in ('image/jpeg','image/png','image/webp'):raise HTTPException(415,'JPEG, PNG or WebP required')
    data=await file.read(4*1024*1024+1)
    if not data or len(data)>4*1024*1024:raise HTTPException(413,'Image exceeds 4 MB or is empty')
    try:
        import pytesseract,io
        from PIL import Image
        im=Image.open(io.BytesIO(data));im.verify()
        im=Image.open(io.BytesIO(data))
        text=pytesseract.image_to_string(im)
        return {'text':text,'verified':False,'storage':'discarded','warning':'Synthetic documents only. Review and correct manually.'}
    except ImportError:raise HTTPException(503,'Optional OCR dependencies are not installed. Enter identity manually.')
    except Exception:raise HTTPException(422,'Could not extract text from this image. Enter details manually.')
@router.patch('/{case_id}/reports/{report_id}/review')
async def review_report(case_id:str,report_id:str,summary:ClinicalSummary,user=Depends(require('paramedic','hospital','coordinator','admin')),db:Session=Depends(get_db)):
    get_case_or_404(case_id,user,db)
    report=db.get(Report,report_id)
    if not report or report.case_id!=case_id:raise HTTPException(404,'Report not found')
    if report.original_summary is None:report.original_summary=report.summary
    report.summary=summary.model_dump();report.review_status='human_confirmed';report.reviewed_by=user.id;report.reviewed_at=utc()
    ev=record(db,'clinical.report_confirmed',user,case_id=case_id,payload={'report_id':report.id})
    db.commit();await publish(ev);return obj(report)
@router.post('/{case_id}/observations',status_code=201)
async def add_observation(case_id:str,data:ObservationIn,user=Depends(require('paramedic','hospital','coordinator','admin')),db:Session=Depends(get_db)):
    case=get_case_or_404(case_id,user,db)
    obs=Observation(case_id=case_id,field=data.field,value=data.value,unit=data.unit,source='manual',created_by=user.id)
    db.add(obs); db.flush(); conflicts=[]
    latest=db.query(Report).filter_by(case_id=case_id).order_by(Report.created_at.desc()).first()
    if latest:
        extracted=latest.summary.get('vitals',{}).get(data.field)
        if extracted and extracted.strip().lower()!=((data.value+' '+(data.unit or '')).strip().lower()):
            cf=Conflict(case_id=case_id,field=data.field,left_value=extracted,right_value=(data.value+' '+(data.unit or '')).strip(),left_source='extracted:'+latest.id,right_source='manual:'+obs.id)
            db.add(cf);conflicts.append(cf.id)
    case.updated_at=utc();ev=record(db,'clinical.observation_added',user,case_id=case_id,payload={'field':data.field,'conflict':bool(conflicts)})
    db.commit();await publish(ev);return {'observation':obj(obs),'conflict_ids':conflicts}
@router.post('/{case_id}/conflicts/{conflict_id}/resolve')
async def resolve(case_id:str,conflict_id:str,data:ConflictResolution,user=Depends(require('paramedic','hospital','coordinator','admin')),db:Session=Depends(get_db)):
    get_case_or_404(case_id,user,db)
    cf=db.get(Conflict,conflict_id)
    if not cf or cf.case_id!=case_id:raise HTTPException(404,'Conflict not found')
    if cf.resolved:raise HTTPException(409,'Conflict already resolved')
    cf.resolved=True;cf.resolution=data.resolution;cf.resolved_by=user.id
    ev=record(db,'clinical.conflict_resolved',user,case_id=case_id,payload={'conflict_id':cf.id})
    db.commit();await publish(ev);return obj(cf)

@router.post('/{case_id}/radio-dispatch',status_code=201)
async def send_radio_dispatch(case_id:str,data:RadioDispatchIn,user=Depends(require('paramedic','coordinator','hospital','admin')),db:Session=Depends(get_db)):
    case=get_case_or_404(case_id,user,db)
    ev=record(db,'coordination.radio_dispatch',user,case_id=case_id,hospital_id=case.intended_hospital_id or case.confirmed_hospital_id,payload={
        'sender_name':user.name,
        'sender_role':user.role,
        'channel':data.channel,
        'language':data.language,
        'message':data.message,
        'audio_simulated':data.audio_simulated,
        'urgency':data.urgency
    })
    case.updated_at=utc()
    db.commit()
    await publish(ev)
    return {'status':'transmitted','event_id':ev.id,'sequence':ev.sequence,'occurred_at':ev.occurred_at.isoformat()}

@router.post('/{case_id}/doctor-directive',status_code=201)
async def send_doctor_directive(case_id:str,data:DoctorDirectiveIn,user=Depends(require('hospital','coordinator','admin')),db:Session=Depends(get_db)):
    case=get_case_or_404(case_id,user,db)
    ev=record(db,'clinical.doctor_directive',user,case_id=case_id,hospital_id=user.hospital_id or case.intended_hospital_id,payload={
        'doctor_name':user.name,
        'hospital_id':user.hospital_id,
        'directive':data.directive,
        'priority':data.priority
    })
    case.updated_at=utc()
    db.commit()
    await publish(ev)
    return {'status':'issued','event_id':ev.id,'sequence':ev.sequence,'occurred_at':ev.occurred_at.isoformat()}
