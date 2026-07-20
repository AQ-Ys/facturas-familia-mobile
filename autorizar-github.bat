@echo off
REM Autoriza GitHub CLI (necesario una sola vez) para que Claude pueda crear
REM el repo y ejecutar los builds de iOS en GitHub Actions.
REM Este script abre tu navegador y te guia; usa TU cuenta de GitHub.
"C:\Users\ariel\tools\gh\bin\gh.exe" auth login --hostname github.com --git-protocol https --web
echo.
echo Listo. Ahora dile a Claude: "GitHub autorizado, continua".
pause
