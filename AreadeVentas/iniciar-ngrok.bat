@echo off
title VentasPro - Tunel Ngrok Publico (Puerto 4800)
color 0B
echo.
echo  ============================================
echo   VentasPro - Tunel Ngrok Publico
echo   Puerto objetivo: 4800
echo  ============================================
echo.

cd /d "%~dp0"

if not exist "ngrok.exe" (
    echo  ERROR: No se encontro ngrok.exe en este directorio.
    pause
    exit /b 1
)

echo  Iniciando tunel ngrok para compartir por Internet...
echo.

ngrok.exe http 4800

echo.
echo  Tunel cerrado.
pause
