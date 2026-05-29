'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Sidebar } from '@/components/sidebar'
import { Shield } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth()
  const pathname = usePathname()

  const isLoginPage = pathname === '/login'

  useEffect(() => {
    if (loading) return

    if (!isAuthenticated && !isLoginPage) {
      window.location.href = '/login'
    }

    if (isAuthenticated && isLoginPage) {
      window.location.href = '/'
    }
  }, [isAuthenticated, loading, isLoginPage])

  // Show spinner while checking session
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
            <Shield className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Verificando sesion...</p>
        </div>
      </div>
    )
  }

  // Not authenticated and not on login page — blank while redirecting
  if (!isAuthenticated && !isLoginPage) {
    return null
  }

  // Authenticated user on login page — blank while redirecting to dashboard
  if (isAuthenticated && isLoginPage) {
    return null
  }

  // On login page with no session: show login without sidebar
  if (isLoginPage) {
    return <>{children}</>
  }

  // Authenticated: show sidebar + content
  return <Sidebar>{children}</Sidebar>
}
