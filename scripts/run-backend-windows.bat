@echo off
cd /d "%~dp0..\backend"
if not exist .venv\Scripts\python.exe (
  py -m venv .venv
  .venv\Scripts\python.exe -m pip install -r requirements.txt
)
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
