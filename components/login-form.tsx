'use client'

import { useState } from 'react'
import { useAuth, useProtectedFetch } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LogOut, LogIn, AlertCircle } from 'lucide-react'

export function LoginForm() {
  const { isAuthenticated, user, loading, error, login, logout } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLocalError(null)

    try {
      await login(email, password)
      setEmail('')
      setPassword('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setLocalError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  // Demo users
  const demoUsers = [
    { email: 'auditor@aseguradora.com', password: 'demo123', label: 'Auditor (Acceso Total)' },
    { email: 'analista@aseguradora.com', password: 'demo123', label: 'Analista (Acceso Modificado)' },
    { email: 'usuario@aseguradora.com', password: 'demo123', label: 'Usuario (Acceso Limitado)' },
  ]

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md mx-auto mt-8">
          <div className="p-6 space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-900">✓ Sesión Activa</p>
              <p className="text-lg font-bold text-green-900 mt-1">{user.name}</p>
              <p className="text-sm text-green-700">{user.email}</p>
              <div className="mt-3 inline-block bg-green-200 text-green-900 text-xs font-semibold px-3 py-1 rounded-full">
                {user.role}
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-4">
              Los datos ahora estarán enmascarados según tu rol.
            </p>

            <Button
              onClick={handleLogout}
              variant="destructive"
              className="w-full"
              disabled={loading}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
      <Card className="max-w-md w-full">
        <div className="p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sistema Seguro</h1>
            <p className="text-sm text-gray-500 mt-1">Detección de Fraude en Seguros</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || localError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <Input
                type="email"
                placeholder="usuario@aseguradora.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <Input
                type="password"
                placeholder="demo123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !email || !password}
            >
              <LogIn className="w-4 h-4 mr-2" />
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-medium text-gray-600 uppercase">Usuarios de Prueba:</p>
            {demoUsers.map((user) => (
              <button
                key={user.email}
                onClick={() => {
                  setEmail(user.email)
                  setPassword(user.password)
                }}
                className="w-full text-left p-2 text-xs border border-gray-200 rounded hover:bg-gray-50 transition"
              >
                <div className="font-mono text-gray-700">{user.email}</div>
                <div className="text-gray-500 text-xs">{user.label}</div>
              </button>
            ))}
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-900">
              Este es un sistema de demostración. Los datos están protegidos según el rol del usuario.
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    </div>
  )
}
