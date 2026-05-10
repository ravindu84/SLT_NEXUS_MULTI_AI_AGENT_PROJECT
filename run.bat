@echo off
echo ===================================================
echo   SLT NEXUS - Unified Ecosystem Starter
echo ===================================================
echo.

:: Check for backend venv
if exist "venv\Scripts\activate.bat" (
    echo [1/2] Starting Backend (FastAPI)...
    start "SLT NEXUS Backend" cmd /k ".\venv\Scripts\python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"
) else if exist "my_env\Scripts\activate.bat" (
    echo [1/2] Starting Backend (FastAPI)...
    start "SLT NEXUS Backend" cmd /k ".\my_env\Scripts\python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"
) else (
    echo [!] Warning: No Python venv found. Trying global python...
    start "SLT NEXUS Backend" cmd /k "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"
)

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
