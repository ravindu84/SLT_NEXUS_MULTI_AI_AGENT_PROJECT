@echo off
echo ===================================================
echo   SLT NEXUS - Unified Ecosystem Starter
echo ===================================================
echo.

echo [1/2] Starting Backend (FastAPI)...
:: Using global python since gTTS was installed there
start "SLT NEXUS Backend" cmd /k "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo [2/2] Starting Frontend (Next.js)...
cd frontend
start "SLT NEXUS Frontend" cmd /k "npm run dev"

echo.
echo ===================================================
echo   System is starting! 
echo   - Frontend: http://localhost:3000
echo   - Backend:  http://localhost:8000
echo ===================================================
pause
