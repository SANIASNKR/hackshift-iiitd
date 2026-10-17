import os, hashlib, hmac, secrets, re
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from sqlalchemy.orm import Session
from .db import get_db
from .models import User, Case, Acceptance, Hospital, Event

SECRET = os.getenv('JWT_SECRET', 'LOCAL_DEMO_ONLY_NOT_FOR_DEPLOYMENT')
TOKEN_MINUTES = int(os.getenv('ACCESS_TOKEN_MINUTES', '480'))
security = HTTPBearer(auto_error=False)
def hash_password(password):
    salt=secrets.token_hex(16)
    return f'{salt}${hashlib.pbkdf2_hmac("sha256",password.encode(),bytes.fromhex(salt),210000).hex()}'
def check_password(password, stored):
    try:
        salt, value=stored.split('$'); result=hashlib.pbkdf2_hmac('sha256',password.encode(),bytes.fromhex(salt),210000).hex()
        return hmac.compare_digest(value,result)
    except Exception: return False

def issue_token(user):
    return jwt.encode({'sub':user.id,'exp':datetime.now(timezone.utc)+timedelta(minutes=TOKEN_MINUTES)},SECRET,algorithm='HS256')
def user_by_token(token, db):
    try:
        ident=jwt.decode(token,SECRET,algorithms=['HS256'])['sub']; user=db.get(User,ident)
        if user: return user
    except (jwt.PyJWTError,KeyError): pass
    raise HTTPException(401,'Authentication required or token expired')
def current_user(credentials:HTTPAuthorizationCredentials|None=Depends(security),db:Session=Depends(get_db)):
    if not credentials: raise HTTPException(401,'Authentication required')
    return user_by_token(credentials.credentials,db)
def require(*roles):
    def check(user=Depends(current_user)):
        if user.role not in roles: raise HTTPException(403,'This action is restricted to another role')
        return user
    return check

def can_access_case(user, case, db):
    if user.role in ('coordinator','admin'): return True
    if user.role=='paramedic': return case.created_by==user.id
    if user.role=='hospital':
        return bool(user.hospital_id and (case.intended_hospital_id==user.hospital_id or case.confirmed_hospital_id==user.hospital_id or db.query(Acceptance).filter_by(case_id=case.id,hospital_id=user.hospital_id).first()))
    return False

def get_case_or_404(case_id, user, db):
    case=db.get(Case,case_id)
    if not case: raise HTTPException(404,'Case not found')
    if not can_access_case(user,case,db): raise HTTPException(403,'Case access denied')
    return case

def can_view_event(user,event,db):
    if user.role in ('admin','coordinator'): return True
    if event.case_id:
        case=db.get(Case,event.case_id)
        if case and can_access_case(user,case,db):return True
    if event.hospital_id and user.role=='hospital' and event.hospital_id==user.hospital_id:return True
    if event.hospital_id and user.role=='paramedic':
        return db.query(Case).filter(Case.created_by==user.id, ((Case.intended_hospital_id==event.hospital_id)|(Case.confirmed_hospital_id==event.hospital_id))).first() is not None
    return False

def record(db,event_type,actor,case_id=None,hospital_id=None,payload=None):
    ev=Event(event_type=event_type,actor_id=actor.id,case_id=case_id,hospital_id=hospital_id,payload=payload or {})
    db.add(ev); db.flush(); return ev

def obj(x):
    if x is None:return None
    return {c.name:getattr(x,c.name) for c in x.__table__.columns}

def utc():return datetime.now(timezone.utc)
