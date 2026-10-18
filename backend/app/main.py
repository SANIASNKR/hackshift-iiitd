import os,asyncio,json,logging
from contextlib import asynccontextmanager
from fastapi import FastAPI,WebSocket,WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import HTTPException
from .db import SessionLocal
from .models import User,Event,Ack,Acceptance
from .core import user_by_token,can_view_event,obj,utc,record
from .seed import seed
from .live import manager,publish
from .routes_cases import router as cases
from .routes_coordination import router as coordination
from .routes_ops import router as operations
from datetime import timedelta

logger = logging.getLogger(__name__)

async def timeout_loop():
    while True:
        await asyncio.sleep(10)
        try:
            with SessionLocal() as db:
                threshold=utc()-timedelta(seconds=int(os.getenv('ACCEPTANCE_TIMEOUT_SECONDS','120')))
                pending=db.query(Acceptance).filter_by(status='pending').all()
                evs=[]
                for req in pending:
                    created=req.created_at.replace(tzinfo=utc().tzinfo) if req.created_at.tzinfo is None else req.created_at
                    if not req.escalated_at and created<threshold:
                        actor=db.get(User,req.created_by);req.escalated_at=utc()
                        ev=record(db,'acceptance.escalated',actor,case_id=req.case_id,hospital_id=req.hospital_id,payload={'acceptance_id':req.id,'timeout':True})
                        evs.append(ev.id)
                db.commit()
            for id in evs:await manager.broadcast(id)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception('Acceptance timeout processing failed')
@asynccontextmanager
async def lifespan(app):
    seed()
    task=asyncio.create_task(timeout_loop())
    yield
    task.cancel()
    try:await task
    except asyncio.CancelledError:pass
app=FastAPI(title='AyuStream AI — Synthetic Demo API',version='0.1.0',description='Emergency coordination demonstration; NOT clinically validated or intended for live emergencies.',lifespan=lifespan)
origins=[origin.strip() for origin in os.getenv('CORS_ORIGINS','http://localhost:5173,http://127.0.0.1:5173,https://ayustream-frontend.onrender.com').split(',') if origin.strip()]
app.add_middleware(CORSMiddleware,allow_origins=origins,allow_credentials=True,allow_methods=['*'],allow_headers=['*'])
app.include_router(cases);app.include_router(coordination);app.include_router(operations)

@app.websocket('/ws')
async def ws(websocket:WebSocket):
    token=websocket.query_params.get('token','')
    cursor_str=websocket.query_params.get('after','0')
    try:cursor=max(0,int(cursor_str))
    except ValueError:await websocket.close(code=1008);return
    with SessionLocal() as db:
        try:user=user_by_token(token,db)
        except HTTPException:await websocket.close(code=1008);return
        uid=user.id
    await websocket.accept();await manager.add(uid,websocket)
    try:
        with SessionLocal() as db:
            user=db.get(User,uid)
            missed=db.query(Event).filter(Event.sequence>cursor).order_by(Event.sequence.asc()).limit(1000).all()
            visible=[obj(e) for e in missed if can_view_event(user,e,db)]
        for ev in visible:await websocket.send_json(jsonable_encoder({'type':'event','event':ev,'replayed':True}))
        await websocket.send_json({'type':'ready','replayed':len(visible)})
        while True:
            try:
                raw=await asyncio.wait_for(websocket.receive_text(),timeout=35)
            except asyncio.TimeoutError:
                await websocket.send_json({'type':'ping'});continue
            try:msg=json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({'type':'error','message':'Invalid JSON'});continue
            if msg.get('type')=='ping':await websocket.send_json({'type':'pong','at':utc().isoformat()})
            elif msg.get('type')=='ack':
                with SessionLocal() as db:
                    u=db.get(User,uid)
                    e=db.query(Event).filter_by(id=msg.get('event_id')).first()
                    if e and can_view_event(u,e,db):
                        if not db.query(Ack).filter_by(event_id=e.id,user_id=uid).first():db.add(Ack(event_id=e.id,user_id=uid));db.commit()
                        await websocket.send_json({'type':'ack_confirmed','event_id':e.id})
                    else:await websocket.send_json({'type':'error','message':'Unknown or inaccessible event'})
            else:await websocket.send_json({'type':'error','message':'Unsupported client event'})
    except (WebSocketDisconnect,RuntimeError):pass
    finally:manager.remove(uid,websocket)
