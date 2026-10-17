import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

class Base(DeclarativeBase): pass
URL = os.getenv('DATABASE_URL', 'sqlite:///./ayustream.db')
engine = create_engine(URL, connect_args={'check_same_thread': False, 'timeout': 15} if URL.startswith('sqlite') else {}, pool_pre_ping=True)
if URL.startswith('sqlite'):
    @event.listens_for(engine, 'connect')
    def pragma(dbapi_connection, _):
        cursor = dbapi_connection.cursor(); cursor.execute('PRAGMA foreign_keys=ON'); cursor.execute('PRAGMA busy_timeout=15000'); cursor.close()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
def get_db():
    with SessionLocal() as db: yield db
