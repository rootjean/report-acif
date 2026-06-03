@echo off
title Reportes Inmobiliaria
color 0A

echo.
echo  =============================================
echo   REPORTES COMERCIALES - Iniciando sistema...
echo  =============================================
echo.

:: Verificar Node.js
node -v >nul 2>&1
IF ERRORLEVEL 1 (
  echo  ERROR: Node.js no esta instalado.
  echo  Descargalo en: https://nodejs.org
  echo.
  pause
  exit
)

:: Instalar dependencias backend si no existen
IF NOT EXIST "backend\node_modules" (
  echo  Instalando dependencias del backend...
  cd backend
  call npm install
  cd ..
)

:: Instalar dependencias frontend si no existen
IF NOT EXIST "node_modules" (
  echo  Instalando dependencias del frontend...
  call npm install
)

:: Crear carpeta data si no existe
IF NOT EXIST "data" mkdir data

echo.
echo  Iniciando backend en puerto 3001...
start "Backend - Reportes" cmd /k "cd /d %~dp0backend && node server.js"

timeout /t 2 /nobreak >nul

echo  Iniciando frontend en puerto 3000...
echo.
echo  La app se abrira en tu navegador automaticamente.
echo  Para cerrar el sistema, cierra ambas ventanas de consola.
echo.

start "Frontend - Reportes" cmd /k "cd /d %~dp0 && npm start"
