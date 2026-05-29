'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LogIn, AlertCircle } from 'lucide-react'

export function LoginForm() {
  const { error, login } = useAuth()
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
      window.location.href = '/'
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setLocalError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const demoUsers = [
    { email: 'auditor@aseguradora.com', password: 'demo123', label: 'Auditor (Acceso Total)' },
    { email: 'analista@aseguradora.com', password: 'demo123', label: 'Analista (Acceso Modificado)' },
    { email: 'usuario@aseguradora.com', password: 'demo123', label: 'Usuario (Acceso Limitado)' },
  ]

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="max-w-md w-full">
        <div className="p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sistema Seguro</h1>
            <p className="text-sm text-muted-foreground mt-1">Deteccion de Fraude en Seguros</p>
          </div>

          {(error || localError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || localError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
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
              <label className="block text-sm font-medium text-foreground mb-2">
                Contrasena
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
              {isLoading ? 'Iniciando sesion...' : 'Iniciar Sesion'}
            </Button>
          </form>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Usuarios de Prueba:</p>
            {demoUsers.map((demoUser) => (
              <button
                key={demoUser.email}
                onClick={() => {
                  setEmail(demoUser.email)
                  setPassword(demoUser.password)
                }}
                className="w-full text-left p-2 text-xs border border-border rounded hover:bg-accent transition"
              >
                <div className="font-mono text-foreground">{demoUser.email}</div>
                <div className="text-muted-foreground text-xs">{demoUser.label}</div>
              </button>
            ))}
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Este es un sistema de demostracion. Los datos estan protegidos segun el rol del usuario.
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    </div>
  )
}
