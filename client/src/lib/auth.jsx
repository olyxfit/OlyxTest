import { createContext, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken, clearToken } from './api.js'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!getToken())

  useEffect(() => {
    if (!getToken()) return
    api('/me')
      .then((d) => setUser(d.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  const requestOtp = (phone) =>
    api('/otp/request', { method: 'POST', body: { phone } })

  const verifyOtp = async (phone, code, name) => {
    const d = await api('/otp/verify', { method: 'POST', body: { phone, code, name } })
    setToken(d.token)
    setUser(d.user)
  }

  const login = async (phone, password) => {
    const d = await api('/login', { method: 'POST', body: { phone, password } })
    setToken(d.token)
    setUser(d.user)
  }

  const register = async (name, phone, password) => {
    const d = await api('/register', { method: 'POST', body: { name, phone, password } })
    setToken(d.token)
    setUser(d.user)
  }

  const logout = async () => {
    try { await api('/logout', { method: 'POST' }) } catch {}
    clearToken()
    setUser(null)
  }

  const updateProfile = async (data) => {
    const d = await api('/me', { method: 'PATCH', body: data })
    setUser(d.user)
  }

  const updateAvatar = async (dataUrl) => {
    const d = await api('/me/avatar', { method: 'PUT', body: { dataUrl } })
    setUser(d.user)
  }

  const removeAvatar = async () => {
    const d = await api('/me/avatar', { method: 'DELETE' })
    setUser(d.user)
  }

  const refresh = () => api('/me').then((d) => setUser(d.user)).catch(() => {})

  return (
    <AuthCtx.Provider value={{ user, loading, requestOtp, verifyOtp, login, register, logout, setUser, refresh, updateProfile, updateAvatar, removeAvatar }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
