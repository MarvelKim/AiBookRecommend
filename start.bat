@echo off
cd /d "%~dp0"
start "" http://localhost:4180
node server.js
