@echo off
setlocal

where node >nul 2>nul
if %errorlevel%==0 (
  node "%~dp0server\server.js"
  exit /b %errorlevel%
)

echo.
echo No se encontro Node.js 20 o superior.
echo Instala Node.js, abre una nueva terminal y vuelve a ejecutar este archivo.
echo https://nodejs.org/
exit /b 1
