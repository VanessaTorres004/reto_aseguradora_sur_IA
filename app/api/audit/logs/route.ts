import { NextRequest, NextResponse } from 'next/server'
import { requireRole, MaskLevel } from '@/lib/security/auth'
import { getAuditLogs, getAuditStats, exportAuditLogsAsCSV } from '@/lib/security/audit-log'

/**
 * GET /api/audit/logs
 * 
 * Headers:
 *   - Authorization: Bearer <token>  (AUDITOR role required)
 * 
 * Query parameters:
 *   - format: 'json' | 'csv' (default: 'json')
 *   - limit: number (default 100)
 *   - since: ISO date string (optional)
 */
export async function GET(request: NextRequest) {
  try {
    // ===== AUTENTICACIÓN Y AUTORIZACIÓN =====
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = requireRole(token, 'AUDITOR')
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: AUDITOR role required' },
        { status: 403 }
      )
    }

    const { searchParams } = request.nextUrl
    const format = searchParams.get('format') || 'json'
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const since = searchParams.get('since') ? new Date(searchParams.get('since')!) : undefined

    // ===== OBTENER LOGS =====
    const logs = getAuditLogs({ since }).slice(0, limit)

    if (format === 'csv') {
      const csv = exportAuditLogsAsCSV()
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="audit-logs.csv"',
        },
      })
    }

    return NextResponse.json({
      ok: true,
      meta: {
        returned: logs.length,
        limit,
        since: since?.toISOString() || null,
      },
      data: logs,
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 })
  }
}
