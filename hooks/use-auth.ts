import { useState, useCallback, useEffect } from 'react'

export interface User {
  id: string
  email: string
  name: string
  role: 'AUDITOR' | 'ANALYST' | 'VIEWER'
  picture?: string
  isAuthenticated: boolean
}

interface Session {
  user: User
  token: string
  expiresAt: string
}

/**
 * Hook para manejar autenticación
 * Almacena el token en localStorage
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar sesión del localStorage
  useEffect(() => {
    const stored = localStorage.getItem('auth_session')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Verificar si no expiró
        if (new Date(parsed.expiresAt) > new Date()) {
          setSession(parsed)
        } else {
          localStorage.removeItem('auth_session')
        }
      } catch (err) {
        console.error('Error parsing session:', err)
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Login failed')
      }

      const data = await response.json()
      const sessionData = {
        user: data.user,
        token: data.token,
        expiresAt: data.expiresAt,
      }

      setSession(sessionData)
      localStorage.setItem('auth_session', JSON.stringify(sessionData))

      return sessionData
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setLoading(true)
    try {
      const token = session?.token
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        })
      }

      setSession(null)
      localStorage.removeItem('auth_session')
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setLoading(false)
    }
  }, [session?.token])

  const isAuthenticated = !!session?.user.isAuthenticated
  const token = session?.token

  return {
    session,
    user: session?.user ?? null,
    token,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
  }
}

/**
 * Hook para obtener header de autorización
 */
export function useAuthHeader() {
  const { token } = useAuth()

  if (!token) return null

  return {
    'Authorization': `Bearer ${token}`,
  }
}

/**
 * Hook para llamadas a API protegidas
 */
export function useProtectedFetch<T>(url: string, options?: RequestInit) {
  const { token } = useAuth()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!token) {
      setError('Not authenticated')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'API request failed')
      }

      const result = await response.json()
      setData(result.data ?? result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching data'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [token, url, options])

  return { data, loading, error, fetchData }
}
