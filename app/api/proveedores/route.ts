import { NextRequest, NextResponse } from 'next/server'
import { proveedores, siniestros } from '@/lib/data'

/**
 * GET /api/proveedores
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
    const { searchParams } = request.nextUrl

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

      return {
        ...p,
        totalCasos: casos.length,
        casosRojos,
        casosAmarillos,
        casosVerdes: casos.filter(s => s.nivelRiesgo === 'VERDE').length,
        montoTotal,
        scorePromedio,
        tasaRiesgo: casos.length > 0 ? Math.round((casosRojos / casos.length) * 100) : 0,
      }
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

    return NextResponse.json({
      ok: true,
      meta: { total, limit, offset, returned: paginated.length },
      data: paginated,
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
