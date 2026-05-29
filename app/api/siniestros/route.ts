import { NextRequest, NextResponse } from 'next/server'
import { siniestros, filterSiniestros } from '@/lib/data'
import type { RiskLevel } from '@/lib/data'

/**
 * GET /api/siniestros
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
    const { searchParams } = request.nextUrl

    const nivelRiesgo = searchParams.get('nivelRiesgo') as RiskLevel | null
    const ramo = searchParams.get('ramo') || undefined
    const sucursal = searchParams.get('sucursal') || undefined
    const search = searchParams.get('search') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const sort = searchParams.get('sort') || 'score'
    const order = searchParams.get('order') || 'desc'

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

    return NextResponse.json({
      ok: true,
      meta: {
        total,
        limit,
        offset,
        returned: paginated.length,
        filters: { nivelRiesgo, ramo, sucursal, search },
      },
      data: paginated,
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
