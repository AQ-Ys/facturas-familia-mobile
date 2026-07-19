# Facturas Familia — Mobile (Hotwire Native)

App móvil Android construida con [Hotwire Native](https://native.hotwired.dev):
un shell nativo (Kotlin) que envuelve la superficie web renderizada por el
servidor Rails bajo `/native` (ver `facturas-familia-rails`, sección
"Mobile app (Hotwire Native)"). La navegación entre pantallas es nativa
(pila de fragments, modales) dirigida por el `path_configuration.json`.

> **Pivote 2026-07**: este proyecto reemplaza al prototipo React Native/Expo,
> preservado tal cual en `legacy-expo/` como referencia (no se mantiene).

## Estructura

```
android/                      Proyecto Android (Gradle, Kotlin)
├── app/src/main/
│   ├── kotlin/com/facturasfamilia/app/
│   │   ├── FacturasApplication.kt   Config Hotwire + path configuration
│   │   └── MainActivity.kt          HotwireActivity, un solo navigator
│   ├── assets/json/path-configuration.json   Copia embebida (fallback)
│   └── res/                         Layout, tema (colores de marca), ícono
└── app/src/debug/                   Overlay SOLO debug: cleartext HTTP dev
```

## Toolchain (verificado 2026-07-18)

- JDK 17 (Microsoft OpenJDK, `C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot`)
- Android SDK en `C:\Users\ariel\android-sdk` (cmdline-tools, platform 35, build-tools 35.0.0)
- Gradle 8.14.3 vía wrapper (`android/gradlew.bat`)
- AGP 8.13.2 + Kotlin 2.3.0 — misma combinación que usa el repo oficial
  `hotwired/hotwire-native-android`
- `dev.hotwire:core:1.3.0` + `dev.hotwire:navigation-fragments:1.3.0`
  (coordenadas verificadas contra Maven Central — el groupId es `dev.hotwire`)

## Compilar

```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot"
cd android
.\gradlew.bat assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

## Servidor de desarrollo

- **Emulador**: `BASE_URL` debug = `http://10.0.2.2:3000` (alias del loopback
  del host). Basta `rails server` normal.
- **Dispositivo físico** (misma Wi-Fi): el server debe escuchar en todas las
  interfaces — `rails server -b 0.0.0.0` — y `BASE_URL` debe apuntar a la IP
  LAN del host (hoy `192.168.18.12`; cámbiala en `app/build.gradle.kts` y en
  `app/src/debug/res/xml/network_security_config.xml` si tu IP cambia).
  Ojo: el `bind 0.0.0.0` de `config/puma.rb` es pisado por el CLI de
  `rails server` — verificado con netstat, no asumido.

## Seguridad

- **Release = HTTPS únicamente.** El manifest principal no declara
  `networkSecurityConfig`; Android bloquea todo cleartext por defecto
  (targetSdk 35). El permiso de cleartext para los hosts dev vive solo en el
  overlay `src/debug/` y jamás llega a un build release — alineado con el
  `force_ssl` del backend y las expectativas de Ley 81 (Panamá) / leyes
  estatales de EE.UU. sobre cifrado en tránsito.
- WebView remote debugging habilitado solo en debug (`BuildConfig.DEBUG`).
- La sesión vive en la cookie `httponly` del backend dentro del WebView del
  shell; la app no almacena credenciales ni tokens propios.
- `allowBackup=false`: sin backups automáticos del estado de la app.

## Path configuration

- Embebida: `app/src/main/assets/json/path-configuration.json` (primer
  arranque / sin red).
- Remota: `GET /native/configurations/android_v1.json` servida por Rails
  desde `public/` — permite evolucionar reglas de navegación sin publicar
  una versión nueva de la app. Versionada (`android_v1`) para poder romper
  compatibilidad con `_v2` sin afectar apps viejas.
- Reglas actuales: todo navega en la pila web por defecto con
  pull-to-refresh; `/native/login` sin pull-to-refresh; agregar factura
  (`/native/invoices/new`) y la revisión del escaneo (`review`) abren como
  **modal** nativo.

## Bridge Component de cámara (Fase 3, 2026-07-19)

`bridge/CameraComponent.kt` + `bridge/ReceiptUploader.kt` +
`MainActivity.launchCamera` implementan el componente "camera" (pareado con
`bridge_camera_controller.js` en el Rails). Flujo verificado de punta a
punta en el emulador: botón "📷 Tomar foto" (solo visible en la app) →
cámara del sistema (`ACTION_IMAGE_CAPTURE`, **sin permiso CAMERA**; el
manifest solo declara `<queries>` para visibilidad del intent — sin eso,
Android 11+ bloquea la cámara silenciosamente, se ve como `AppsFilter ...
BLOCKED` en logcat) → subida multipart nativa a `/native/invoices/scan` con
la cookie de sesión del WebView + el token CSRF por-formulario → los
`Set-Cookie` de la respuesta se propagan de vuelta al `CookieManager` del
WebView (la sesión-cookie carga el borrador de revisión — sin esto la
pantalla de revisión saldría vacía) → la web visita el redirect con Turbo.
El archivo temporal de captura se borra tras subir. El `<input type=file>`
sigue como fallback universal.

## Bridge Component de escaneo QR (2026-07-19)

`bridge/QrScannerComponent.kt` + `MainActivity.launchImagePick` (pareado con
`bridge_qr_controller.js`): "📷 Escanear código QR" abre un chooser
cámara/galería (las facturas suelen llegar como imagen por WhatsApp), el QR
se decodifica **en el dispositivo** con ML Kit (modelo embebido, offline; la
imagen nunca sale del teléfono) y el texto crudo se envía por el formulario
CUFE normal — el servidor (`normalize_cufe`) desenvuelve la URL de consulta
de la DGI (`FacturasPorQR?chFE=...`), así el formato puede evolucionar sin
publicar una versión nueva de la app. Sin permiso CAMERA (misma filosofía
que la captura de fotos). Verificado E2E en emulador: QR con CUFE real →
galería → decodificado → factura correcta detectada como duplicada.

## iOS sin Mac (Fase 4, 2026-07-19)

`ios/` contiene la app iOS (Swift, HotwireNative 1.3.0 — APIs verificadas
contra el código fuente del tag exacto, no contra docs). **No hay Mac en el
equipo**, así que el `.xcodeproj` nunca se edita a mano: se genera con
[XcodeGen](https://github.com/yonaskolb/XcodeGen) desde `ios/project.yml`, y
la compilación + smoke test corren en **GitHub Actions (runner macOS)** —
ver `.github/workflows/ios-build.yml`:

1. `xcodegen generate` → `xcodebuild` para el simulador **sin firma** (los
   builds de simulador no requieren cuenta Apple).
2. Arranca un simulador iPhone, instala la app, la lanza, verifica que el
   proceso siga vivo y sube un screenshot como artefacto (sin servidor en CI
   la app muestra la pantalla de error de Hotwire — eso igual prueba que el
   shell, la librería y el path configuration inicializan sin crashear).

Desarrollo local iOS: el **simulador** llega al `rails server` del host por
`localhost:3000` directamente (a diferencia de Android/10.0.2.2). ATS queda
en HTTPS-only con la única excepción `NSAllowsLocalNetworking` (localhost) —
ningún HTTP arbitrario, alineado con `force_ssl` del backend.

Para dispositivo físico / TestFlight hace falta la cuenta Apple Developer
($99/año — el Agreement ya está en Descargas) + certificados; se cablea en
el mismo workflow cuando exista.

## Pendiente (fases siguientes)

- Bridge components de cámara/QR en iOS (hoy solo Android; la web oculta
  esos botones en iOS automáticamente por el user agent).
- Ícono/splash de marca reales; firma release (Play Store / App Store).
