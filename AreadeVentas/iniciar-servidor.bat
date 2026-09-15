@echo off
title VentasPro - Dashboard Area de Ventas (Puerto 4800)
color 0A
echo.
echo  ============================================
echo   VentasPro - Dashboard de Area de Ventas
echo   Puerto: 4800
echo  ============================================
echo.

:: Cambiar al directorio del script
cd /d "%~dp0"

:: Usar el node.exe local del proyecto
set NODE_EXE=%~dp0node-v24.15.0-win-x64\node.exe

if not exist "%NODE_EXE%" (
    echo  ERROR: No se encontro node.exe en node-v24.15.0-win-x64\
    echo  Asegurate de tener la carpeta node-v24.15.0-win-x64 en el directorio.
    pause
    exit /b 1
)

echo  Iniciando servidor en puerto 4800...
echo  Accede desde otro equipo con la IP de red mostrada abajo
echo.

"%NODE_EXE%" server.js

echo.
echo  Servidor detenido.
pause
