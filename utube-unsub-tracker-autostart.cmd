@echo off

cd /d %~dp0
c:\cygwin64\bin\screen.exe -dmS utube-unsub-tracker cmd /K nodemon -w main.js main.js -- --checkival 5
