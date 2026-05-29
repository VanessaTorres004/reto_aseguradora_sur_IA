import { NextRequest, NextResponse } from 'next/server'
import { siniestros, filterSiniestros } from '@/lib/data'
import type { RiskLevel } from '@/lib/data'
import { requireAuth, MaskLevel } from '@/lib/security/auth'
import { applyMaskingByLevel, PII_MASK_CONFIG } from '@/lib/security/pii-masking'
import { logAuditEvent } from '@/lib/security/audit-log'

/**
 * GET /api/siniestros
 *
 * Headers:
 *   - Authorization: Bearer <token>  (required)
 *
 * Query parameters:
 *   - nivelRiesgo: 'ROJO' | 'AMARILLO' | 'VERDE'
 *   - ramo:        string  (e.g. 'Vehículos')
 *   - sucursal:    string  (e.g. 'Quito')
 *   - search:      string  (searches id, asegurado, descripción)
 *   - limit:       number  (default 50, max 500)
 *   - offset:      number  (default 0)
 *   - sort:        'score' | 'monto' | 'fecha'  (default 'score')
 *   - order:       'asc' | 'desc'  (default 'desc')
 *
 * GET /api/siniestros/:id  — not supported in this route; use query ?search=SIN-XXXXX
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
        action: 'VIEW_CASE',
        resource: 'api/siniestros',
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
        action: 'VIEW_CASE',
        resource: 'api/siniestros',
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

    const nivelRiesgo = searchParams.get('nivelRiesgo') as RiskLevel | null
    const ramo = searchParams.get('ramo') || undefined
    const sucursal = searchParams.get('sucursal') || undefined
    const search = searchParams.get('search') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const sort = searchParams.get('sort') || 'score'
    const order = searchParams.get('order') || 'desc'

    // ===== AUTORIZACIÓN Y MAPEO DE MASKINGLEVEL =====
    const maskLevel: MaskLevel = user.role === 'AUDITOR' ? 'AUDITOR' : user.role === 'ANALYST' ? 'AUTHENTICATED' : 'PUBLIC'

    let data = filterSiniestros(siniestros, {
      nivelRiesgo: nivelRiesgo ?? undefined,
      ramo,
      sucursal,
      searchTerm: search,
    })

    // Sort
    data = [...data].sort((a, b) => {
      let va: number, vb: number
      if (sort === 'monto') { va = a.montoReclamado; vb = b.montoReclamado }
      else if (sort === 'fecha') { va = new Date(a.fechaOcurrencia).getTime(); vb = new Date(b.fechaOcurrencia).getTime() }
      else { va = a.scoreFinal; vb = b.scoreFinal }
      return order === 'asc' ? va - vb : vb - va
    })

    const total = data.length
    const paginated = data.slice(offset, offset + limit)

    // ===== ENMASCARAMIENTO DE PII SEGÚN ROL =====
    const maskedData = paginated.map(caso => ({
      ...caso,
      // Enmascarar datos sensibles del asegurado
      idAsegurado: maskLevel === 'AUDITOR' ? caso.idAsegurado : applyMaskingByLevel({ documento: caso.idAsegurado }, maskLevel).documento,
    }))

    // ===== AUDITORÍA =====
    logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: 'VIEW_CASE',
      resource: `api/siniestros?nivelRiesgo=${nivelRiesgo}`,
      details: { 
        filters: { nivelRiesgo, ramo, sucursal, search },
        limit,
        offset,
        returned: maskedData.length,
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
        returned: maskedData.length,
        filters: { nivelRiesgo, ramo, sucursal, search },
        user: {
          email: user.email,
          role: user.role,
        },
      },
      data: maskedData,
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Internal server error'
    logAuditEvent({
      userId: 'system',
      userEmail: 'system',
      action: 'VIEW_CASE',
      resource: 'api/siniestros',
      details: { error: errorMsg },
      status: 'FAILED',
      riskLevel: 'MEDIUM',
    })
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 })
  }
}
