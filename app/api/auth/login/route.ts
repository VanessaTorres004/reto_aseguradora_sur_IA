import { NextRequest, NextResponse } from 'next/server'
import { simulateGoogleLogin, DEMO_USERS } from '@/lib/security/auth'
import { logAuditEvent } from '@/lib/security/audit-log'

/**
 * POST /api/auth/login
 * 
 * Body:
 *   - email: string (required)
 *   - password: string (required, for demo only)
 * 
 * Response:
 *   - token: string (to be used in Authorization header)
 *   - user: { id, email, name, role }
 *   - expiresAt: ISO date
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email and password required' },
        { status: 400 }
      )
    }

    // Demo: Validar contra usuarios de prueba
    let validUser = false
    let userName = ''

    for (const [, user] of Object.entries(DEMO_USERS)) {
      if (user.email === email && user.password === password) {
        validUser = true
        userName = user.name
        break
      }
    }

    if (!validUser) {
      logAuditEvent({
        userId: 'unknown',
        userEmail: email,
        action: 'LOGIN',
        resource: 'api/auth/login',
        details: { error: 'Invalid credentials' },
        status: 'FAILED',
        riskLevel: 'MEDIUM',
      })
      return NextResponse.json(
        { ok: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Simular login
    const session = await simulateGoogleLogin(email, userName)

    logAuditEvent({
      userId: session.user.id,
      userEmail: session.user.email,
      action: 'LOGIN',
      resource: 'api/auth/login',
      details: { role: session.user.role },
      status: 'SUCCESS',
      riskLevel: 'LOW',
    })

    return NextResponse.json({
      ok: true,
      user: session.user,
      token: session.token,
      expiresAt: session.expiresAt,
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 })
  }
}

/**
 * POST /api/auth/logout
 * 
 * Headers:
 *   - Authorization: Bearer <token>
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'No token provided' },
        { status: 400 }
      )
    }

    logAuditEvent({
      userId: 'user',
      userEmail: 'user',
      action: 'LOGOUT',
      resource: 'api/auth/logout',
      details: {},
      status: 'SUCCESS',
      riskLevel: 'LOW',
    })

    return NextResponse.json({ ok: true, message: 'Logged out' })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 })
  }
}
