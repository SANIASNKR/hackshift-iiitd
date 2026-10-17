@echo off
cd /d "%~dp0..\frontend"
if not exist node_modules npm install
npm run dev
