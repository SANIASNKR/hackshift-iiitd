import os,tempfile
from pathlib import Path
# This environment is read by the SQLAlchemy engine on import.
_TEST_DB=Path(tempfile.gettempdir())/'ayustream_pytest_isolated_v1.db'
os.environ['DATABASE_URL']='sqlite:///'+str(_TEST_DB)
os.environ['JWT_SECRET']='pytest-only-secret-not-production'
os.environ['AI_PROVIDER']='local'
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        # Each test starts with an independent seeded database.
        admin=auth(c,'admin')
        response=c.post('/api/demo/reset',headers=admin)
        assert response.status_code==200,response.text
        yield c

def auth(c,role='paramedic'):
    r=c.post('/api/auth/login',json={'username':role,'password':'demo1234'})
    assert r.status_code==200,r.text
    return {'Authorization':'Bearer '+r.json()['token']}

@pytest.fixture
def login():return auth
