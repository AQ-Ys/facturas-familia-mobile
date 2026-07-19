# Facturas Familia — Mobile (React Native / Expo)

App móvil para rastrear gastos familiares mediante facturas electrónicas panameñas (DGI).

## Stack

- React Native + Expo SDK (blank template)
- React Navigation v6 (Stack + Bottom Tabs)
- Axios — HTTP + JWT interceptor via expo-secure-store
- i18n-js + expo-localization — ES/EN
- expo-camera — escanear CUFE desde QR (CameraView + onBarcodeScanned)
- expo-clipboard — pegar CUFE desde portapapeles
- expo-secure-store — almacenamiento cifrado del JWT (Keychain iOS / Keystore Android)
- @react-native-async-storage/async-storage — persistencia del perfil de usuario (no sensible)

## Instalación

```bash
cd C:\Users\ariel\facturas-familia-mobile
npm install
```

## Cómo correr

### Android (emulador o dispositivo)
```bash
npx expo start
# presiona 'a' para abrir en Android
```

### iOS (requiere macOS + Xcode)
```bash
npx expo start
# presiona 'i' para abrir en iOS simulator
```

### Con Expo Go (dispositivo físico)
```bash
npx expo start
# escanea el QR con la app Expo Go
```

## Configuración de red

La base URL del API se lee de la variable de entorno `EXPO_PUBLIC_API_BASE_URL`
(soportada nativamente por Expo SDK 54+, sin dependencias adicionales),
configurada en el archivo `.env` en la raíz del proyecto (no versionado — ver
`.gitignore`). Si la variable no está definida, `src/api/api.js` cae de vuelta
a `http://192.168.18.12:3000/api/v1` como valor por defecto.

| Entorno | URL a usar |
|---|---|
| Emulador Android | `http://10.0.2.2:3000/api/v1` |
| Simulador iOS | `http://127.0.0.1:3000/api/v1` |
| Dispositivo físico | IP local del host, ej. `http://192.168.18.12:3000/api/v1` (ver `ipconfig`) |

Cambia `EXPO_PUBLIC_API_BASE_URL` en `.env` según el entorno (requiere reiniciar
`expo start` para que Metro recargue las variables de entorno).

## Estructura del proyecto

```
facturas-familia-mobile/
├── App.js                          # Punto de entrada: AuthProvider + AppNavigator
└── src/
    ├── api/
    │   └── api.js                  # Instancia axios con interceptores JWT y 401
    ├── services/
    │   ├── auth.js                 # login, register
    │   ├── invoices.js             # CRUD facturas + exportCSV
    │   ├── dashboard.js            # resumen del mes
    │   ├── alerts.js               # alertas de gasto
    │   ├── family.js               # grupo familiar + invitaciones
    │   ├── projects.js             # proyectos + miembros + facturas
    │   └── categories.js           # categorías personalizadas
    ├── context/
    │   └── AuthContext.js          # estado de sesión, login/logout
    ├── navigation/
    │   ├── AppNavigator.js         # raíz: Auth vs App (tabs)
    │   ├── AuthNavigator.js        # Login + Register
    │   └── TabNavigator.js         # 5 tabs + stacks anidados
    ├── screens/
    │   ├── auth/
    │   │   ├── LoginScreen.js
    │   │   └── RegisterScreen.js
    │   ├── dashboard/
    │   │   └── DashboardScreen.js  # resumen + top categorías + transacciones recientes
    │   ├── invoices/
    │   │   ├── InvoicesScreen.js   # lista con filtro por categoría
    │   │   ├── InvoiceDetailScreen.js # detalle + editor de categoría (modal)
    │   │   └── AddInvoiceScreen.js # CUFE + pegar + escanear QR
    │   ├── projects/
    │   │   ├── ProjectsScreen.js        # lista + crear proyecto
    │   │   ├── ProjectDetailScreen.js   # detalle + miembros + facturas asociadas
    │   │   └── AddInvoiceToProjectScreen.js # flujo 2 pasos: factura → ítems
    │   ├── alerts/
    │   │   └── AlertsScreen.js     # lista + crear alerta (categoría, monto, período)
    │   └── family/
    │       └── FamilyScreen.js     # miembros + invitar + categorías
    ├── components/
    │   ├── common/
    │   │   ├── LoadingSpinner.js
    │   │   ├── EmptyState.js
    │   │   ├── ErrorMessage.js
    │   │   └── LanguageToggle.js
    │   └── invoices/
    │       └── InvoiceCard.js
    ├── i18n/
    │   ├── es.json                 # strings en español
    │   ├── en.json                 # strings en inglés
    │   └── index.js               # instancia i18n-js + setLocale()
    └── theme/
        └── colors.js              # paleta centralizada
```

## Pantallas implementadas

### Auth
- **Login** — email + contraseña, enlace a registro; muestra el error del backend cuando la cuenta aún no está confirmada, con acceso directo al modal de confirmación
- **Register** — nombre, email, contraseña (mínimo 10 caracteres), nombre de familia. El registro ya no inicia sesión: muestra un modal con el token de confirmación (placeholder de desarrollo — no hay servidor de correo aún) y un campo para confirmarlo vía `/auth/confirm`, que sí inicia la sesión

### Dashboard (Inicio)
- Total gastado del mes, conteo de facturas, categoría principal
- Gasto por categoría (top 5)
- Últimas transacciones con acceso al detalle

### Facturas
- Lista con filtro por categoría (chips desplegables)
- Botón "Agregar" → AddInvoiceScreen
- **AddInvoice**: campo CUFE + pegar desde portapapeles + escanear QR; muestra preview tras guardar
- **InvoiceDetail**: todos los campos (emisor, receptor, totales, ítems, pagos); editar categoría con modal

### Proyectos
- Lista con monto total y conteo de facturas
- Crear proyecto (nombre, tipo, fechas)
- **ProjectDetail**: miembros (agregar/remover), facturas asociadas (agregar/desasociar)
- **AddInvoiceToProject**: paso 1 seleccionar factura, paso 2 elegir ítems (toggle "incluir toda")

### Alertas
- Lista de alertas activas con categoría, límite, período y alcance
- Crear alerta con picker de categoría

### Familia
- Card del grupo familiar con conteo de miembros
- Lista de miembros con roles (propietario / miembro)
- Invitar miembro por email → muestra token para compartir
- Gestión de categorías personalizadas (crear / eliminar)
- **Zona de peligro**: eliminar la cuenta propia (cualquier miembro) o eliminar todo el grupo familiar (solo el propietario), con confirmación destructiva

## Diferencias respecto a la versión web

| Aspecto | Web | Mobile |
|---|---|---|
| Almacenamiento JWT | `localStorage` | `expo-secure-store` (cifrado — Keychain en iOS / Keystore en Android). El objeto `user` (no sensible: id/nombre/email/rol) sigue en `AsyncStorage`. |
| Export CSV | `URL.createObjectURL` + `<a>` | `responseType: 'text'` — integrar `expo-sharing` para descargar |
| Escaneo CUFE | N/A | `expo-camera` (`CameraView` + `onBarcodeScanned`) |
| i18n | `react-i18next` | `i18n-js` + `expo-localization` |
| Keys i18n | Compatibles con `es.json` / `en.json` del proyecto web | ✓ |

## Cuenta de prueba (misma del backend)

```
Email:    ysmael@familia.com
Password: 123456
Familia:  Familia Delgado
```

## Bugs resueltos

- **"Invalid email or password" en login con credenciales correctas** (3 causas simultáneas):
  1. `BASE_URL` apuntaba a `:8000/v1` en lugar de `:3000/api/v1` (Rails). La petición nunca llegaba al servidor → `err.response` era `null` → se mostraba el fallback del i18n en lugar del error real.
  2. El interceptor 401 de axios llamaba a `_onUnauthorized()` (logout) en *cualquier* 401, incluso en intentos de login fallidos donde no había token activo. Ahora solo se dispara si hay un token almacenado (sesión vencida).
  3. El `catch` del LoginScreen solo leía `err.response?.data?.error`. Se agregó `err.response?.data?.detail` y un mensaje explícito para errores de red.

- **Login no redirigía después del submit**: `AuthContext` leía `data.usuario` pero el backend devuelve `data.user`. El campo era `undefined`, por lo que `setUser(undefined)` dejaba la app en la pantalla de login aunque el API respondía 200. Corregido a `data.user` en `login` y `register`.

- **Logout no limpiaba AsyncStorage correctamente**: el interceptor 401 de axios solo reseteaba el estado en memoria (`setUser(null)`) pero no borraba las keys del storage. Al reiniciar la app, el token vencido se restauraba y el login fallaba. Solucionado haciendo que `_onUnauthorized` llame a `logout` completo (limpia `token`, `user`, `family_group` de AsyncStorage y resetea todo el estado del `AuthContext`).

## Backend requerido

Rails API corriendo en `http://localhost:3000` (o la IP configurada en `src/api/api.js`).
Ver `C:\Users\ariel\facturas-familia-rails` para instrucciones.
