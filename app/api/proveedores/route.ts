import { NextRequest, NextResponse } from 'next/server'
import { proveedores, siniestros } from '@/lib/data'
import { requireAuth, MaskLevel } from '@/lib/security/auth'
import { maskName } from '@/lib/security/pii-masking'
import { logAuditEvent } from '@/lib/security/audit-log'

/**
 * GET /api/proveedores
 *
 * Headers:
 *   - Authorization: Bearer <token>  (required)
 *
 * Query parameters:
 *   - listaRestrictiva: 'true' | 'false'
 *   - tipo:             string  (e.g. 'Taller Automotriz')
 *   - ciudad:           string
 *   - sort:             'alertas' | 'monto' | 'servicios'  (default 'alertas')
 *   - limit:            number  (default 30, max 100)
 *   - offset:           number  (default 0)
 *
 * Returns enriched provider data including case counts and risk metrics.
 */
export async function GET(request: NextRequest) {
  try {
    // ===== AUTENTICACIÓN =====
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      logAuditEvent({
        userId: 'anonymous',
        userEmail: 'anonymous',
        action: 'VIEW_PROVIDER',
        resource: 'api/proveedores',
        details: { error: 'No token provided' },
        status: 'FAILED',
        riskLevel: 'HIGH',
      })
      return NextResponse.json(
        { ok: false, error: 'Unauthorized: missing token' },
        { status: 401 }
      )
    }

    const user = requireAuth(token)
    if (!user) {
      logAuditEvent({
        userId: 'unknown',
        userEmail: 'unknown',
        action: 'VIEW_PROVIDER',
        resource: 'api/proveedores',
        details: { error: 'Invalid token' },
        status: 'FAILED',
        riskLevel: 'HIGH',
      })
      return NextResponse.json(
        { ok: false, error: 'Unauthorized: invalid token' },
        { status: 401 }
      )
    }

    const { searchParams } = request.nextUrl

    // ===== MAPEO DE MASKINGLEVEL SEGÚN ROL =====
    const maskLevel: MaskLevel = user.role === 'AUDITOR' ? 'AUDITOR' : user.role === 'ANALYST' ? 'AUTHENTICATED' : 'PUBLIC'

    const listaParam = searchParams.get('listaRestrictiva')
    const tipo = searchParams.get('tipo') || undefined
    const ciudad = searchParams.get('ciudad') || undefined
    const sort = searchParams.get('sort') || 'alertas'
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let data = proveedores.map(p => {
      const casos = siniestros.filter(s => s.idProveedor === p.id)
      const casosRojos = casos.filter(s => s.nivelRiesgo === 'ROJO').length
      const casosAmarillos = casos.filter(s => s.nivelRiesgo === 'AMARILLO').length
      const montoTotal = casos.reduce((a, s) => a + s.montoReclamado, 0)
      const scorePromedio = casos.length > 0
        ? Math.round(casos.reduce((a, s) => a + s.scoreFinal, 0) / casos.length)
        : 0

      // ===== ENMASCARAMIENTO DE PII =====
      const proveedorMasked = {
        ...p,
        nombre: maskLevel !== 'AUDITOR' ? maskName(p.nombre) : p.nombre,
        totalCasos: casos.length,
        casosRojos,
        casosAmarillos,
        casosVerdes: casos.filter(s => s.nivelRiesgo === 'VERDE').length,
        montoTotal,
        scorePromedio,
        tasaRiesgo: casos.length > 0 ? Math.round((casosRojos / casos.length) * 100) : 0,
      }

      return proveedorMasked
    }).filter(p => p.totalCasos > 0)

    // Filters
    if (listaParam !== null) {
      const isLista = listaParam === 'true'
      data = data.filter(p => p.listaRestrictiva === isLista)
    }
    if (tipo) data = data.filter(p => p.tipo === tipo)
    if (ciudad) data = data.filter(p => p.ciudad === ciudad)

    // Sort
    data = [...data].sort((a, b) => {
      if (sort === 'monto') return b.montoTotal - a.montoTotal
      if (sort === 'servicios') return b.totalCasos - a.totalCasos
      return b.casosRojos - a.casosRojos  // 'alertas' default
    })

    const total = data.length
    const paginated = data.slice(offset, offset + limit)

    // ===== AUDITORÍA =====
    logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: 'VIEW_PROVIDER',
      resource: `api/proveedores`,
      details: {
        filters: { listaRestrictiva: listaParam, tipo, ciudad },
        limit,
        offset,
        returned: paginated.length,
        total,
        role: user.role,
      },
      status: 'SUCCESS',
      riskLevel: 'LOW',
    })

    return NextResponse.json({
      ok: true,
      meta: {
        total,
        limit,
        offset,
        returned: paginated.length,
        user: {
          email: user.email,
          role: user.role,
        },
      },
      data: paginated,
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Internal server error'
    logAuditEvent({
      userId: 'system',
      userEmail: 'system',
      action: 'VIEW_PROVIDER',
      resource: 'api/proveedores',
      details: { error: errorMsg },
      status: 'FAILED',
      riskLevel: 'MEDIUM',
    })
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 })
  }
}
