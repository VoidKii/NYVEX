@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 20 or newer from https://nodejs.org/ then reopen this file.
  pause
  exit /b 1
)
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Created .env. Open it in Notepad and add your private OPENAI_API_KEY.
)
echo Starting NYVEX. Keep this window open; open http://localhost:3000 in your browser.
echo Stop NYVEX with Ctrl+C.
npm start
pause
