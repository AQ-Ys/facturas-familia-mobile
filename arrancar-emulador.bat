@echo off
REM Arranca el emulador Android con la app Facturas Familia lista para probar.
REM Requisitos ya instalados: Android SDK en C:\Users\ariel\android-sdk, AVD "facturas_test".
REM El servidor Rails debe estar corriendo (rails server en facturas-familia-rails).

set ANDROID_HOME=C:\Users\ariel\android-sdk
set PATH=%ANDROID_HOME%\platform-tools;%PATH%

echo Arrancando emulador (tarda 2-4 minutos la primera vez)...
start "" "%ANDROID_HOME%\emulator\emulator.exe" -avd facturas_test -gpu swiftshader_indirect -no-snapshot -cores 4 -memory 4096

echo Esperando a que el emulador termine de arrancar...
:wait
timeout /t 5 /nobreak >nul
adb shell getprop sys.boot_completed 2>nul | findstr "1" >nul
if errorlevel 1 goto wait

echo Instalando la app...
adb install -r "%~dp0android\app\build\outputs\apk\debug\app-debug.apk"

echo Copiando QR de prueba a Descargas del emulador...
adb push "%~dp0test\factura_qr.png" /sdcard/Download/factura_qr.png 2>nul
adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file:///sdcard/Download/factura_qr.png" >nul 2>&1

echo Abriendo la app...
adb shell am start -n com.facturasfamilia.app/.MainActivity

echo.
echo Listo. Usuario: ysmael@familia.com  Clave: TestPass2026!
pause
