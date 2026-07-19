import React, { createContext, useState, useCallback, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import {
  login as apiLogin,
  register as apiRegister,
  confirm as apiConfirm,
  logout as apiLogout,
} from '../services/auth'
import api from '../api/api'

export const AuthContext = createContext(null)

// The JWT is stored in expo-secure-store (encrypted, Keychain/Keystore),
// never in AsyncStorage. `user` holds no sensitive data (id/name/email/role)
// so plain AsyncStorage is fine for it.
const ASYNC_STORAGE_KEYS = ['user', 'family_group']

export function AuthProvider({ children, navigationRef }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session on app start. Both the token (SecureStore) and the
  // cached user (AsyncStorage) must be present — if either is missing the
  // session is considered invalid and the user is sent back to Login.
  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 3000)

    Promise.all([
      SecureStore.getItemAsync('token'),
      AsyncStorage.getItem('user'),
    ])
      .then(([token, storedUser]) => {
        if (token && storedUser) {
          try { setUser(JSON.parse(storedUser)) } catch {}
        }
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout)
        setLoading(false)
      })
  }, [])

  const logout = useCallback(async () => {
    try {
      // Best-effort: invalidate the token server-side before wiping it
      // locally. If this fails (network down, token already expired/
      // revoked, account just deleted, etc.) we still clear local state —
      // a network failure must never block a local logout.
      await apiLogout()
    } catch {}

    await SecureStore.deleteItemAsync('token')
    await AsyncStorage.multiRemove(ASYNC_STORAGE_KEYS)
    setUser(null)
  }, [])

  // Register 401 handler so axios can trigger a full logout (clears storage + state)
  useEffect(() => {
    api._onUnauthorized = logout
    return () => { api._onUnauthorized = null }
  }, [logout])

  const login = useCallback(async (email, password) => {
    const { data } = await apiLogin(email, password)
    await SecureStore.setItemAsync('token', data.token)
    await AsyncStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }, [])

  // Registration no longer starts a session: the backend creates the
  // account unconfirmed and returns `{ message, email, confirmation_token,
  // requires_confirmation }` — no token/user here. The caller (RegisterScreen)
  // is responsible for guiding the user to confirm() next.
  const register = useCallback(async (name, email, password, family_name) => {
    const { data } = await apiRegister(name, email, password, family_name)
    return data
  }, [])

  // Confirms a pending account (from register() or a family invitation) and
  // starts the session — this is the call that now returns `{ token, user }`.
  const confirm = useCallback(async (token) => {
    const { data } = await apiConfirm(token)
    await SecureStore.setItemAsync('token', data.token)
    await AsyncStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, confirm, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
