import asyncio
from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from .db import SessionLocal
from .models import Event
from .core import can_view_event, obj

class LiveManager:
    def __init__(self):self.clients={}
    async def add(self,user_id,socket):self.clients.setdefault(user_id,set()).add(socket)
    def remove(self,user_id,socket):
        if user_id in self.clients:
            self.clients[user_id].discard(socket)
            if not self.clients[user_id]:self.clients.pop(user_id,None)
    async def broadcast(self,ev_id):
        with SessionLocal() as db:
            event=db.query(Event).filter_by(id=ev_id).first()
            if not event:return
            from .models import User
            targets=[(id,sock) for id,sockets in list(self.clients.items()) for sock in list(sockets) if (u:=db.get(User,id)) and can_view_event(u,event,db)]
            message=jsonable_encoder({'type':'event','event':obj(event)})
        for uid,socket in targets:
            try:await socket.send_json(message)
            except Exception as exc:
                import traceback
                traceback.print_exception(exc)
                self.remove(uid,socket)
manager=LiveManager()
async def publish(event):
    await manager.broadcast(event.id)
