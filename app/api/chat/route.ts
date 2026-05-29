
import {
  consumeStream,
  convertToModelMessages,
  streamText,
  UIMessage,
} from 'ai'

import { groq } from '@ai-sdk/groq'

import {
  siniestros,
  proveedores,
  dashboardStats,
  getRamos,
  getSucursales
} from '@/lib/data'

export const maxDuration = 30

// ============================================================
// CONTEXTO DEL SISTEMA
// ============================================================

function buildSystemContext(): string {

  const top10 = siniestros.slice(0, 10)

  const provConAlertas = proveedores.filter(
    p => p.listaRestrictiva
  )

  const sucConMasAlertas = getSucursales()
    .map(suc => ({
      suc,
      rojos: siniestros.filter(
        s =>
          s.sucursal === suc &&
          s.nivelRiesgo === 'ROJO'
      ).length
    }))
    .sort((a, b) => b.rojos - a.rojos)
    .slice(0, 5)

  const ramosDistribucion = getRamos().map(ramo => {

    const casos = siniestros.filter(
      s => s.ramo === ramo
    )

    return {
      ramo,
      total: casos.length,
      rojos: casos.filter(
        s => s.nivelRiesgo === 'ROJO'
      ).length,
      amarillos: casos.filter(
        s => s.nivelRiesgo === 'AMARILLO'
      ).length
    }
  })

  return `
Eres un analista antifraude experto de Aseguradora del Sur,
especializado en detección de posibles irregularidades
en siniestros de seguros.

IMPORTANTE:
Tu rol es generar ALERTAS DE REVISIÓN,
NO acusaciones de fraude.

Siempre usa lenguaje como:
- "posible irregularidad"
- "requiere revisión"
- "patrón sospechoso"
- "se recomienda investigar"

NUNCA afirmes fraude directamente.

==================================================
RESUMEN DEL DATASET
==================================================

- Total siniestros analizados: ${dashboardStats.totalSiniestros}
- Casos ROJO: ${dashboardStats.casosRojos}
- Casos AMARILLO: ${dashboardStats.casosAmarillos}
- Casos VERDE: ${dashboardStats.casosVerdes}
- Score promedio: ${dashboardStats.scorePromedio}
- Monto total reclamado: $${dashboardStats.montoTotalReclamado.toLocaleString()}
- Proveedores en lista restrictiva: ${dashboardStats.proveedoresEnLista}

==================================================
TOP 10 CASOS DE MAYOR RIESGO
==================================================

${top10.map((s, i) => `
${i + 1}. ${s.id}
- Score: ${s.scoreFinal}
- Riesgo: ${s.nivelRiesgo}
- Ramo: ${s.ramo}
- Cobertura: ${s.cobertura}
- Monto: $${s.montoReclamado.toLocaleString()}
- Alertas: ${s.alertas.join(', ')}
`).join('\n')}

==================================================
PROVEEDORES EN LISTA RESTRICTIVA
==================================================

${provConAlertas.map(p => `
- ${p.id}
- ${p.nombre}
- ${p.tipo}
- ${p.ciudad}
- Motivo: ${p.motivoLista}
`).join('\n')}

==================================================
SUCURSALES CON MÁS ALERTAS ROJAS
==================================================

${sucConMasAlertas.map(s => `
- ${s.suc}: ${s.rojos} casos rojos
`).join('\n')}

==================================================
DISTRIBUCIÓN POR RAMO
==================================================

${ramosDistribucion.map(r => `
- ${r.ramo}
  Total: ${r.total}
  Rojos: ${r.rojos}
  Amarillos: ${r.amarillos}
`).join('\n')}

==================================================
METODOLOGÍA DE SCORING
==================================================

- Score 0-40:
  Verde (flujo normal)

- Score 41-75:
  Amarillo (revisión documental)

- Score 76-100:
  Rojo (revisión especializada)

Pesos del score híbrido:
- 40% reglas de negocio
- 35% Random Forest
- 15% Isolation Forest
- 10% NLP

==================================================
SEÑALES DE ALERTA
==================================================

- Siniestros cerca del inicio o fin de póliza
- Proveedores en lista restrictiva
- Documentación incompleta
- Alta frecuencia de reclamos
- Narrativas similares
- Montos atípicos
- Reporte tardío

==================================================

Responde siempre:
- en español
- de forma profesional
- clara y ejecutiva

Prioriza:
- revisión humana
- análisis preventivo
- priorización de riesgos
`
}

// ============================================================
// API ROUTE
// ============================================================

export async function POST(req: Request) {

  console.log(
    "GROQ KEY:",
    process.env.GROQ_API_KEY
  )

  const {
    messages
  }: {
    messages: UIMessage[]
  } = await req.json()

  const systemContext = buildSystemContext()

  const result = streamText({

    // MODELO GROQ
    model: groq('llama-3.3-70b-versatile'),

    system: systemContext,

    messages: await convertToModelMessages(messages),

    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}


