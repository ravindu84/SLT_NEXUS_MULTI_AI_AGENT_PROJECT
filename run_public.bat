@echo off
echo ========================================================
echo           SLT NEXUS - PUBLIC CLOUD MODE
echo ========================================================
echo Starting Backend (FastAPI)...
start cmd /k "cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting Frontend Web Dashboard (Next.js)...
start cmd /k "cd frontend && npm run dev"

echo Starting Public Tunnel (Bypassing AWS Server)...
start cmd /k "npx localtunnel --port 3000 --subdomain slt-nexus-demo"

echo.
echo SLT NEXUS System is now running on a PUBLIC DOMAIN!
echo.
echo Please wait 10 seconds for the servers to start...
echo.
echo ========================================================
echo   TELL THE JUDGES TO GO TO:
echo   https://slt-nexus-demo.loca.lt
echo ========================================================
echo.
echo (Do not use Vercel. Use the link above. It is 100%% Public and works perfectly!)
pause
