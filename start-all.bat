@echo off
chcp 65001 >nul
title Knowledge Journey — backend + frontend
cd /d "%~dp0"
echo Запускаю бэкенд (:3000) и фронт (:4200). Закрой окно, чтобы остановить всё.
node server/start-all.js
pause
