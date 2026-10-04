@echo off
setlocal
set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if exist "%NODE_EXE%" (
  "%NODE_EXE%" "%~dp0server\server.js"
  exit /b %errorlevel%
)

where node >nul 2>nul
if %errorlevel%==0 (
  node "%~dp0server\server.js"
  exit /b %errorlevel%
)

echo.
echo No se encontro Node.js.
echo Ejecuta este proyecto desde Codex o instala Node.js 20 o superior y abre una nueva terminal.
echo https://nodejs.org/
exit /b 1
