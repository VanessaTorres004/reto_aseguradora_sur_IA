import { NextRequest, NextResponse } from 'next/server'
import { analyzeDocument } from '@/lib/fraud-analyzer'

/**
 * POST /api/analizar
 *
 * Body (JSON):
 *   - texto:     string  (required) — plain text of the claim / document
 *   - archivo:   string  (optional) — original file name for context
 *
 * Returns a full FraudAnalysis object with score, risk level, alerts,
 * extracted entities, and recommendations.
 *
 * Example:
 *   curl -X POST /api/analizar \
 *     -H "Content-Type: application/json" \
 *     -d '{"texto": "Robo total del vehículo efectivo sin testigos ...", "archivo": "reclamo.txt"}'
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { texto, archivo } = body as { texto?: string; archivo?: string }

    if (!texto || typeof texto !== 'string' || texto.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: 'El campo "texto" es obligatorio y no puede estar vacío.' },
        { status: 400 }
      )
    }

    if (texto.length > 50_000) {
      return NextResponse.json(
        { ok: false, error: 'El texto no puede superar 50,000 caracteres.' },
        { status: 400 }
      )
    }

    const analysis = analyzeDocument(texto, archivo || 'documento')

    return NextResponse.json({
      ok: true,
      meta: {
        caracteres: texto.length,
        archivo: archivo || null,
        analizadoEn: new Date().toISOString(),
      },
      data: analysis,
    })
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ ok: false, error: 'JSON inválido en el cuerpo de la solicitud.' }, { status: 400 })
    }
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/analizar
 *
 * Returns API documentation / usage reference.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    descripcion: 'API de análisis de fraude — Aseguradora del Sur',
    version: '2.0',
    endpoints: [
      {
        metodo: 'POST',
        ruta: '/api/analizar',
        descripcion: 'Analiza el texto de un reclamo y devuelve un score de fraude',
        cuerpo: { texto: 'string (requerido)', archivo: 'string (opcional)' },
        respuesta: {
          ok: true,
          meta: { caracteres: 'number', archivo: 'string | null', analizadoEn: 'ISO date' },
          data: {
            scoreFinal: 'number (0-100)',
            nivelRiesgo: 'ROJO | AMARILLO | VERDE',
            alertas: 'string[]',
            recomendaciones: 'string[]',
            detalles: { montoDetectado: 'number?', fechaEvento: 'string?', proveedor: 'string?', asegurado: 'string?', poliza: 'string?' },
            explicacion: 'string',
          },
        },
      },
      {
        metodo: 'GET',
        ruta: '/api/siniestros',
        descripcion: 'Lista siniestros con filtros opcionales',
        parametros: ['nivelRiesgo', 'ramo', 'sucursal', 'search', 'limit', 'offset', 'sort', 'order'],
      },
      {
        metodo: 'GET',
        ruta: '/api/proveedores',
        descripcion: 'Lista proveedores enriquecidos con métricas de riesgo',
        parametros: ['listaRestrictiva', 'tipo', 'ciudad', 'sort', 'limit', 'offset'],
      },
    ],
  })
}
