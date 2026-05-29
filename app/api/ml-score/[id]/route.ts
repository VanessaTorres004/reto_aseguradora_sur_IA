import { NextRequest, NextResponse } from 'next/server'
import { analyzeSiniestroWithML } from '@/lib/fraud-analyzer'
import { requireAuth } from '@/lib/security/auth'
import { logAuditEvent } from '@/lib/security/audit-log'

/**
 * GET /api/ml-score/:siniestroId
 * 
 * Calcula el score de ML para un siniestro específico usando:
 * - Regresión Logística (70%)
 * - Detección de Anomalías (30%)
 * 
 * Features utilizadas:
 * - Montos (normalización, Z-score, anomalías)
 * - Proveedor (riesgo histórico, lista restrictiva)
 * - Asegurado (tasa de fraude histórica, reclamos)
 * - Temporal (días desde último reclamo, reclamos recientes)
 * - Documentación y patrones
 * 
 * Headers:
 *   - Authorization: Bearer <token>  (required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ===== AUTENTICACIÓN =====
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized: missing token' },
        { status: 401 }
      )
    }

    const user = requireAuth(token)
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized: invalid token' },
        { status: 401 }
      )
    }

    const { id: siniestroId } = await params

    // ===== CALCULAR ML SCORE =====
    const mlAnalysis = analyzeSiniestroWithML(siniestroId)

    if (!mlAnalysis) {
      logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        action: 'ANALYZE_DOCUMENT',
        resource: `api/ml-score/${siniestroId}`,
        details: { error: 'Siniestro no encontrado' },
        status: 'FAILED',
        riskLevel: 'LOW',
      })

      return NextResponse.json(
        { ok: false, error: 'Siniestro no encontrado' },
        { status: 404 }
      )
    }

    // ===== AUDITORÍA =====
    logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: 'ANALYZE_DOCUMENT',
      resource: `api/ml-score/${siniestroId}`,
      details: {
        scoreML: mlAnalysis.scoreML,
        probabilidad: mlAnalysis.probabilidadFraude,
        role: user.role,
      },
      status: 'SUCCESS',
      riskLevel: 'LOW',
    })

    return NextResponse.json({
      ok: true,
      data: {
        siniestroId,
        ...mlAnalysis,
        modelo: {
          nombre: 'Ensemble ML',
          componentes: ['Regresión Logística (70%)', 'Detección de Anomalías (30%)'],
          features: 16,
          descripción: 'Modelo entrenado con datos históricos de reclamaciones',
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        usuario: user.email,
      },
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Internal server error'

    logAuditEvent({
      userId: 'system',
      userEmail: 'system',
      action: 'ANALYZE_DOCUMENT',
      resource: 'api/ml-score',
      details: { error: errorMsg },
      status: 'FAILED',
      riskLevel: 'MEDIUM',
    })

    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 })
  }
}
