@echo off
echo ========================================================
echo           SLT NEXUS - LOCAL COMMAND CENTER
echo ========================================================
echo Starting Backend (FastAPI)...
start cmd /k "uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting Frontend Web Dashboard (Next.js)...
start cmd /k "cd frontend && npm run dev"

echo.
echo SLT NEXUS System is now running locally!
echo.
echo Web Dashboard: http://localhost:3000
echo Backend API:   http://192.168.1.10:8000
echo.
echo Your Mobile Apps (APK) will now connect seamlessly.
echo Keep these terminal windows open during your demonstration!
pause
