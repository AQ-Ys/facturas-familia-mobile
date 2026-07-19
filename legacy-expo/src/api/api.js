import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

// Expo SDK 54+ exposes `EXPO_PUBLIC_*` env vars natively (no extra deps).
// Configure the real value in `.env` at the project root; this hardcoded
// LAN IP is only a fallback so the app keeps working out of the box.
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.18.12:3000/api/v1'
// Rails corre en el puerto 3000. Las rutas son /api/v1/...
// Emulador Android: reemplazar IP por 10.0.2.2
// Simulador iOS: reemplazar IP por 127.0.0.1
// Dispositivo físico: usar la IP LAN del host (192.168.x.x:3000)

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Attach JWT on every request. The token lives in expo-secure-store
// (Keychain on iOS / Keystore on Android) instead of AsyncStorage so it is
// encrypted at rest — SecureStore's API is async just like AsyncStorage, so
// this still works as a request interceptor. A JWT easily fits under
// SecureStore's ~2KB per-value limit on Android.
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global 401 handler — only triggers session logout when a token was active.
// Login failures (no token yet) are NOT treated as session expiry.
// Tokens now expire after 24h (down from 30 days) and are revoked instantly
// server-side on logout, so this path is exercised more often than before.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      const token = await SecureStore.getItemAsync('token')
      if (token) {
        await SecureStore.deleteItemAsync('token')
        api._onUnauthorized?.()
      }
    }
    return Promise.reject(err)
  }
)

export default api
