/**
 * Simulación de autenticación con Google OAuth
 * En producción, usar NextAuth.js real
 */

export interface User {
  id: string
  email: string
  name: string
  role: 'AUDITOR' | 'ANALYST' | 'VIEWER'
  picture?: string
  isAuthenticated: boolean
}

export interface Session {
  user: User
  expiresAt: Date
  token: string
}

/**
 * Niveles de visibilidad/enmascaramiento según autenticación y rol.
 *
 * PUBLIC: datos más protegidos o enmascarados
 * AUTHENTICATED: usuario autenticado con visibilidad parcial
 * AUDITOR: auditor con visibilidad completa
 */
export const MaskLevel = {
  PUBLIC: 'PUBLIC',
  AUTHENTICATED: 'AUTHENTICATED',
  AUDITOR: 'AUDITOR',
} as const

export type MaskLevel = typeof MaskLevel[keyof typeof MaskLevel]

// Simulación de usuarios autenticados
const authenticatedUsers = new Map<string, Session>()

// Simulación de token de sesión
let currentSession: Session | null = null

/**
 * Simula login con Google OAuth
 * En producción: implementar con NextAuth.js
 */
export async function simulateGoogleLogin(email: string, name: string): Promise<Session> {
  const user: User = {
    id: `user_${Date.now()}`,
    email,
    name,
    role: determinateRole(email),
    isAuthenticated: true,
  }

  const token = generateSessionToken()

  const session: Session = {
    user,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
    token,
  }

  authenticatedUsers.set(token, session)
  currentSession = session

  console.log(`[AUTH] Usuario autenticado: ${email} (${user.role})`)
  return session
}

/**
 * Valida si una sesión es válida
 */
export function validateSession(token: string): Session | null {
  const session = authenticatedUsers.get(token)

  if (!session) return null

  if (session.expiresAt < new Date()) {
    authenticatedUsers.delete(token)
    return null
  }

  return session
}

/**
 * Obtiene la sesión actual del usuario
 */
export function getCurrentSession(): Session | null {
  return currentSession
}

/**
 * Logout del usuario
 */
export function logout(token: string): void {
  authenticatedUsers.delete(token)

  if (currentSession?.token === token) {
    currentSession = null
  }
}

/**
 * Genera un token de sesión seguro
 */
function generateSessionToken(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Determina el rol del usuario basado en su email
 */
function determinateRole(email: string): User['role'] {
  // En producción, esto vendría de una base de datos o directorio LDAP
  const domain = email.split('@')[1]

  if (email.includes('admin')) return 'AUDITOR'
  if (email.includes('analista')) return 'ANALYST'
  if (domain === 'manager.local') return 'ANALYST'

  return 'VIEWER'
}

/**
 * Verifica si el usuario tiene permiso para una acción
 */
export function canPerformAction(
  role: User['role'],
  action: 'VIEW_ALL_DATA' | 'MODIFY_DATA' | 'EXPORT_AUDIT' | 'MANAGE_USERS'
): boolean {
  const permissions: Record<User['role'], Set<string>> = {
    AUDITOR: new Set([
      'VIEW_ALL_DATA',
      'MODIFY_DATA',
      'EXPORT_AUDIT',
      'MANAGE_USERS',
    ]),
    ANALYST: new Set([
      'VIEW_ALL_DATA',
      'MODIFY_DATA',
      'EXPORT_AUDIT',
    ]),
    VIEWER: new Set([
      'VIEW_ALL_DATA',
    ]),
  }

  return permissions[role]?.has(action) ?? false
}

/**
 * Middleware para proteger rutas
 */
export function requireAuth(token: string | undefined): User | null {
  if (!token) return null

  const session = validateSession(token)
  return session?.user ?? null
}

/**
 * Middleware para requerir rol específico
 */
export function requireRole(
  token: string | undefined,
  requiredRole: User['role']
): User | null {
  const user = requireAuth(token)

  if (!user) return null

  const roleHierarchy: Record<User['role'], number> = {
    AUDITOR: 3,
    ANALYST: 2,
    VIEWER: 1,
  }

  if (roleHierarchy[user.role] >= roleHierarchy[requiredRole]) {
    return user
  }

  return null
}

/**
 * Demo: obtiene usuarios mock para pruebas
 */
export const DEMO_USERS = {
  auditor: {
    email: 'auditor@aseguradora.com',
    name: 'Auditor Jefe',
    password: 'demo123', // Solo para pruebas
  },
  analyst: {
    email: 'analista@aseguradora.com',
    name: 'Analista de Fraude',
    password: 'demo123',
  },
  viewer: {
    email: 'usuario@aseguradora.com',
    name: 'Usuario Regular',
    password: 'demo123',
  },
}