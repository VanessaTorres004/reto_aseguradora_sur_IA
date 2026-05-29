import { generateText } from 'ai'
import { groq } from '@ai-sdk/groq'

import {
  siniestros,
  proveedores,
  dashboardStats,
  getRamos,
  getSucursales
} from '@/lib/data'

export const maxDuration = 30
export const runtime = 'nodejs'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

// ============================================================
// HELPERS
// ============================================================

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value)
}

function formatScore(value: number): string {
  return Number(value).toFixed(1)
}

function getTop10Siniestros() {
  return [...siniestros]
    .sort((a, b) => b.scoreFinal - a.scoreFinal)
    .slice(0, 10)
}

function getProveedoresConcentracion() {
  return proveedores
    .map(proveedor => {
      const casos = siniestros.filter(
        s => s.idProveedor === proveedor.id
      )

      const rojos = casos.filter(
        s => s.nivelRiesgo === 'ROJO'
      ).length

      const amarillos = casos.filter(
        s => s.nivelRiesgo === 'AMARILLO'
      ).length

      const monto = casos.reduce(
        (total, s) => total + s.montoReclamado,
        0
      )

      return {
        id: proveedor.id,
        nombre: proveedor.nombre,
        tipo: proveedor.tipo,
        ciudad: proveedor.ciudad,
        total: casos.length,
        rojos,
        amarillos,
        monto,
        listaRestrictiva: proveedor.listaRestrictiva,
        motivoLista: proveedor.motivoLista
      }
    })
    .filter(p => p.total > 0)
    .sort((a, b) => {
      if (b.rojos !== a.rojos) return b.rojos - a.rojos
      if (b.amarillos !== a.amarillos) return b.amarillos - a.amarillos
      return b.monto - a.monto
    })
}

function getRamosDistribucionOrdenada() {
  return getRamos()
    .map(ramo => {
      const casos = siniestros.filter(
        s => s.ramo === ramo
      )

      const rojos = casos.filter(
        s => s.nivelRiesgo === 'ROJO'
      ).length

      const amarillos = casos.filter(
        s => s.nivelRiesgo === 'AMARILLO'
      ).length

      const total = casos.length
      const porcentajeSospechoso = total > 0
        ? Math.round(((rojos + amarillos) / total) * 100)
        : 0

      return {
        ramo,
        total,
        rojos,
        amarillos,
        porcentajeSospechoso
      }
    })
    .sort((a, b) => {
      if (b.porcentajeSospechoso !== a.porcentajeSospechoso) {
        return b.porcentajeSospechoso - a.porcentajeSospechoso
      }

      if (b.rojos !== a.rojos) {
        return b.rojos - a.rojos
      }

      return b.amarillos - a.amarillos
    })
}

function getSucursalesConMasAlertas() {
  return getSucursales()
    .map(suc => {
      const casos = siniestros.filter(
        s => s.sucursal === suc
      )

      const rojos = casos.filter(
        s => s.nivelRiesgo === 'ROJO'
      ).length

      const amarillos = casos.filter(
        s => s.nivelRiesgo === 'AMARILLO'
      ).length

      return {
        suc,
        total: casos.length,
        rojos,
        amarillos,
        alertas: rojos + amarillos
      }
    })
    .sort((a, b) => {
      if (b.alertas !== a.alertas) return b.alertas - a.alertas
      return b.rojos - a.rojos
    })
}

// ============================================================
// RESPUESTAS CONTROLADAS PARA PREGUNTAS CLAVE
// ============================================================

function buildTop10Response(): string {
  const top10 = getTop10Siniestros()

  return `
### Top 10 siniestros con mayor riesgo de posible irregularidad

Estos son los casos priorizados según el score de riesgo calculado por el prototipo:

| # | Siniestro | Score | Riesgo | Ramo | Cobertura | Sucursal | Monto reclamado | Alertas principales |
|---:|---|---:|---|---|---|---|---:|---|
${top10.map((s, i) => {
  const alertas = s.alertas && s.alertas.length > 0
    ? s.alertas.slice(0, 3).join('; ')
    : 'Sin alertas específicas'

  return `| ${i + 1} | ${s.id} | ${formatScore(s.scoreFinal)} | ${s.nivelRiesgo} | ${s.ramo} | ${s.cobertura} | ${s.sucursal} | ${formatMoney(s.montoReclamado)} | ${alertas} |`
}).join('\n')}

**Recomendación:** se recomienda priorizar estos casos para revisión humana especializada, validando documentación, historial del asegurado, proveedor asociado y consistencia de la narrativa.

*Nota: este análisis genera alertas de revisión, no acusaciones de fraude.*
`.trim()
}

function buildRamosResponse(): string {
  const ramos = getRamosDistribucionOrdenada()
  const principal = ramos[0]

  return `
### Ramos con mayor porcentaje de casos sospechosos

Según la distribución por ramo, estos son los ramos ordenados de mayor a menor porcentaje de casos con alerta roja o amarilla:

| Ramo | Total | Rojos | Amarillos | Porcentaje sospechoso aproximado |
|---|---:|---:|---:|---:|
${ramos.map(r => (
  `| ${r.ramo} | ${r.total} | ${r.rojos} | ${r.amarillos} | ${r.porcentajeSospechoso}% |`
)).join('\n')}

El ramo con mayor concentración relativa de casos sospechosos es **${principal.ramo}**, con aproximadamente **${principal.porcentajeSospechoso}%** de casos rojos o amarillos.

**Recomendación:** se recomienda priorizar la revisión humana de los casos de este ramo, validando documentación, historial asociado, montos reclamados y patrones repetidos.
`.trim()
}

function buildProveedoresResponse(): string {
  const proveedoresConcentracion = getProveedoresConcentracion()
  const totalAlertasRojas = proveedoresConcentracion.reduce(
    (total, p) => total + p.rojos,
    0
  )

  let acumulado = 0

  const proveedores80 = proveedoresConcentracion
    .filter(p => p.rojos > 0)
    .filter(p => {
      if (totalAlertasRojas === 0) return false
      if (acumulado / totalAlertasRojas >= 0.8) return false

      acumulado += p.rojos
      return true
    })

  return `
### Proveedores con mayor concentración de alertas

Estos proveedores concentran más casos rojos o amarillos dentro del dataset:

| # | Proveedor | Ciudad | Total casos | Rojos | Amarillos | Monto asociado | Lista restrictiva |
|---:|---|---|---:|---:|---:|---:|---|
${proveedoresConcentracion.slice(0, 10).map((p, i) => (
  `| ${i + 1} | ${p.nombre} (${p.id}) | ${p.ciudad} | ${p.total} | ${p.rojos} | ${p.amarillos} | ${formatMoney(p.monto)} | ${p.listaRestrictiva ? 'Sí' : 'No'} |`
)).join('\n')}

### Proveedores que concentran aproximadamente el 80% de alertas rojas

| # | Proveedor | Casos rojos | Participación aproximada |
|---:|---|---:|---:|
${proveedores80.map((p, i) => {
  const porcentaje = totalAlertasRojas > 0
    ? Math.round((p.rojos / totalAlertasRojas) * 100)
    : 0

  return `| ${i + 1} | ${p.nombre} (${p.id}) | ${p.rojos} | ${porcentaje}% |`
}).join('\n')}

**Recomendación:** se sugiere revisar la concentración de siniestros por proveedor, especialmente cuando existan casos rojos, lista restrictiva o montos reclamados recurrentes.

*Nota: esto no confirma fraude; únicamente prioriza revisión humana.*
`.trim()
}

function buildSucursalesResponse(): string {
  const sucursales = getSucursalesConMasAlertas()

  return `
### Sucursales con mayor concentración de alertas

| # | Sucursal | Total casos | Rojos | Amarillos | Alertas totales |
|---:|---|---:|---:|---:|---:|
${sucursales.map((s, i) => (
  `| ${i + 1} | ${s.suc} | ${s.total} | ${s.rojos} | ${s.amarillos} | ${s.alertas} |`
)).join('\n')}

**Recomendación:** se recomienda revisar las sucursales con mayor volumen de alertas para identificar patrones operativos, proveedores recurrentes o concentración de casos de alto riesgo.
`.trim()
}

function buildScoringResponse(): string {
  return `
### Metodología de scoring utilizada

El prototipo utiliza un **score híbrido de riesgo** para priorizar siniestros que requieren revisión humana.

| Componente | Peso | Descripción |
|---|---:|---|
| Reglas de negocio | 40% | Evalúa señales como vigencia cercana, documentos incompletos, reporte tardío, montos atípicos y proveedor recurrente. |
| Machine Learning supervisado simulado | 35% | Representa la probabilidad estimada de posible irregularidad usando variables estructuradas del siniestro. |
| Anomalías simuladas | 15% | Identifica comportamientos fuera de lo esperado en montos, frecuencia, fechas o concentración. |
| NLP simulado | 10% | Evalúa similitud narrativa y patrones repetidos en las descripciones de reclamos. |

### Clasificación del riesgo

| Score | Nivel | Acción sugerida |
|---:|---|---|
| 0 - 40 | Verde | Flujo normal. |
| 41 - 75 | Amarillo | Revisión documental. |
| 76 - 100 | Rojo | Revisión especializada por el equipo antifraude. |

**Importante:** esta versión de hackathon trabaja con datos sintéticos y componentes simulados para representar el comportamiento esperado de un modelo productivo. El sistema genera alertas de revisión, no decisiones automáticas.
`.trim()
}

function buildResumenEjecutivoResponse(): string {
  const top3 = getTop10Siniestros().slice(0, 3)
  const ramoPrincipal = getRamosDistribucionOrdenada()[0]
  const proveedorPrincipal = getProveedoresConcentracion()[0]

  return `
### Resumen ejecutivo de casos críticos

El prototipo analizó **${dashboardStats.totalSiniestros} siniestros** y clasificó los casos según un score híbrido de riesgo.

| Indicador | Valor |
|---|---:|
| Total de siniestros | ${dashboardStats.totalSiniestros} |
| Casos rojos | ${dashboardStats.casosRojos} |
| Casos amarillos | ${dashboardStats.casosAmarillos} |
| Casos verdes | ${dashboardStats.casosVerdes} |
| Score promedio | ${dashboardStats.scorePromedio} |
| Monto total reclamado | ${formatMoney(dashboardStats.montoTotalReclamado)} |
| Proveedores en lista restrictiva | ${dashboardStats.proveedoresEnLista} |

### Casos que deberían revisarse primero

| # | Siniestro | Score | Riesgo | Ramo | Monto |
|---:|---|---:|---|---|---:|
${top3.map((s, i) => (
  `| ${i + 1} | ${s.id} | ${formatScore(s.scoreFinal)} | ${s.nivelRiesgo} | ${s.ramo} | ${formatMoney(s.montoReclamado)} |`
)).join('\n')}

### Hallazgos principales

- El ramo con mayor porcentaje sospechoso es **${ramoPrincipal.ramo}**, con aproximadamente **${ramoPrincipal.porcentajeSospechoso}%** de casos rojos o amarillos.
- El proveedor con mayor concentración de alertas es **${proveedorPrincipal.nombre} (${proveedorPrincipal.id})**, con **${proveedorPrincipal.rojos}** casos rojos y **${proveedorPrincipal.amarillos}** casos amarillos.
- Los casos críticos deben ser revisados por un analista humano antes de cualquier decisión operativa.

**Conclusión:** el sistema permite priorizar la revisión, explicar las señales de riesgo y apoyar al equipo antifraude sin reemplazar el criterio humano.
`.trim()
}

function tryBuildControlledResponse(question: string): string | null {
  const q = normalizeText(question)

  if (
    q.includes('10 siniestros') ||
    q.includes('top 10') ||
    (q.includes('mayor riesgo') && q.includes('siniestro'))
  ) {
    return buildTop10Response()
  }

  if (
    q.includes('ramo') &&
    (
      q.includes('porcentaje') ||
      q.includes('sospechoso') ||
      q.includes('sospechosos')
    )
  ) {
    return buildRamosResponse()
  }

  if (
    q.includes('proveedor') &&
    (
      q.includes('alerta') ||
      q.includes('roja') ||
      q.includes('concentra') ||
      q.includes('concentran')
    )
  ) {
    return buildProveedoresResponse()
  }

  if (
    (q.includes('sucursal') || q.includes('sucursales')) &&
    q.includes('alerta')
  ) {
    return buildSucursalesResponse()
  }

  if (
    q.includes('metodologia') ||
    q.includes('scoring') ||
    q.includes('score utilizado') ||
    q.includes('score de riesgo')
  ) {
    return buildScoringResponse()
  }

  if (
    q.includes('resumen ejecutivo') ||
    q.includes('casos criticos') ||
    q.includes('casos críticos') ||
    q.includes('revisar primero')
  ) {
    return buildResumenEjecutivoResponse()
  }

  return null
}

// ============================================================
// CONTEXTO DEL SISTEMA PARA GROQ
// ============================================================

function buildSystemContext(): string {
  const top10 = getTop10Siniestros()
  const provConAlertas = proveedores.filter(p => p.listaRestrictiva)
  const proveedoresConcentracion = getProveedoresConcentracion()
  const ramosDistribucion = getRamosDistribucionOrdenada()
  const sucursales = getSucursalesConMasAlertas().slice(0, 5)

  return `
Eres un agente IA antifraude de Aseguradora del Sur.
Tu función es apoyar al analista humano con priorización, explicación y consulta de posibles irregularidades en siniestros.

IMPORTANTE:
- Generas alertas de revisión, NO acusaciones de fraude.
- No afirmes que existe fraude confirmado.
- No recomiendes rechazar automáticamente un siniestro.
- Usa lenguaje preventivo: "posible irregularidad", "requiere revisión", "patrón sospechoso", "se recomienda validar", "priorizar para análisis humano".
- Usa únicamente los datos entregados en este contexto.
- Si no tienes un dato específico, dilo claramente y recomienda revisar la bandeja completa.

==================================================
RESUMEN DEL DATASET
==================================================

- Total siniestros analizados: ${dashboardStats.totalSiniestros}
- Casos ROJO: ${dashboardStats.casosRojos}
- Casos AMARILLO: ${dashboardStats.casosAmarillos}
- Casos VERDE: ${dashboardStats.casosVerdes}
- Score promedio: ${dashboardStats.scorePromedio}
- Monto total reclamado: ${formatMoney(dashboardStats.montoTotalReclamado)}
- Proveedores en lista restrictiva: ${dashboardStats.proveedoresEnLista}

==================================================
TOP 10 CASOS DE MAYOR RIESGO
==================================================

${top10.map((s, i) => `
${i + 1}. ${s.id}
- Score: ${formatScore(s.scoreFinal)}
- Riesgo: ${s.nivelRiesgo}
- Ramo: ${s.ramo}
- Cobertura: ${s.cobertura}
- Sucursal: ${s.sucursal}
- Proveedor: ${s.idProveedor}
- Monto reclamado: ${formatMoney(s.montoReclamado)}
- Días desde inicio de póliza: ${s.diasDesdeInicio}
- Días para fin de póliza: ${s.diasHastaFin}
- Días hasta reporte: ${s.diasReporte}
- Reclamos previos: ${s.reclamosPrevios}
- Similitud narrativa: ${Math.round(s.similitudNarrativa * 100)}%
- Alertas: ${s.alertas.join(', ')}
`).join('\n')}

==================================================
PROVEEDORES EN LISTA RESTRICTIVA
==================================================

${provConAlertas.map(p => `
- ID: ${p.id}
- Nombre: ${p.nombre}
- Tipo: ${p.tipo}
- Ciudad: ${p.ciudad}
- Motivo: ${p.motivoLista}
`).join('\n')}

==================================================
PROVEEDORES CON MAYOR CONCENTRACIÓN DE ALERTAS
==================================================

${proveedoresConcentracion.slice(0, 10).map((p, i) => `
${i + 1}. ${p.nombre} (${p.id})
- Tipo: ${p.tipo}
- Ciudad: ${p.ciudad}
- Total de siniestros asociados: ${p.total}
- Casos rojos: ${p.rojos}
- Casos amarillos: ${p.amarillos}
- Monto reclamado asociado: ${formatMoney(p.monto)}
- Lista restrictiva: ${p.listaRestrictiva ? 'Sí' : 'No'}
${p.motivoLista ? `- Motivo lista: ${p.motivoLista}` : ''}
`).join('\n')}

==================================================
SUCURSALES CON MÁS ALERTAS
==================================================

${sucursales.map(s => `
- ${s.suc}
  Total: ${s.total}
  Rojos: ${s.rojos}
  Amarillos: ${s.amarillos}
  Alertas totales: ${s.alertas}
`).join('\n')}

==================================================
DISTRIBUCIÓN POR RAMO ORDENADA POR PORCENTAJE SOSPECHOSO
==================================================

${ramosDistribucion.map(r => `
- ${r.ramo}
  Total: ${r.total}
  Rojos: ${r.rojos}
  Amarillos: ${r.amarillos}
  Porcentaje sospechoso aproximado: ${r.porcentajeSospechoso}%
`).join('\n')}

==================================================
METODOLOGÍA DE SCORING
==================================================

Clasificación:
- Score 0-40: Verde, flujo normal.
- Score 41-75: Amarillo, revisión documental.
- Score 76-100: Rojo, revisión especializada.

Pesos del score híbrido del prototipo:
- 40% reglas de negocio
- 35% componente de machine learning supervisado simulado
- 15% componente de anomalías simulado
- 10% componente NLP simulado

Aclaración:
Esta versión de hackathon trabaja con datos sintéticos y componentes simulados para representar el comportamiento esperado de un modelo productivo.

==================================================
FORMATO DE RESPUESTA
==================================================

Responde siempre:
- en español;
- de forma clara;
- con tono profesional;
- sin exagerar;
- sin inventar datos;
- con enfoque de apoyo al analista humano.

Cuando entregues rankings, usa tablas Markdown simples.

Cuando recomiendes acciones, usa frases como:
- "Se recomienda priorizar para revisión humana."
- "Se sugiere validar documentación."
- "Conviene revisar el historial asociado."
- "Requiere análisis del equipo antifraude."

Evita frases demasiado fuertes como:
- "debe ser asignado inmediatamente";
- "fraude evidente";
- "rechazar el caso";
- "cliente fraudulento".
`
}

// ============================================================
// API ROUTE
// ============================================================

export async function POST(req: Request) {
  try {
    let body: { messages?: ChatMessage[] }

    try {
      body = await req.json()
    } catch {
      return Response.json(
        {
          error: 'El cuerpo de la solicitud no tiene un formato JSON válido.'
        },
        { status: 400 }
      )
    }

    const messages = Array.isArray(body.messages)
      ? body.messages.filter(
          message =>
            (message.role === 'user' || message.role === 'assistant') &&
            typeof message.content === 'string' &&
            message.content.trim().length > 0
        )
      : []

    if (messages.length === 0) {
      return Response.json(
        {
          error: 'No se recibió ningún mensaje válido.'
        },
        { status: 400 }
      )
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find(message => message.role === 'user')

    const lastQuestion = lastUserMessage?.content ?? ''

    const controlledResponse = tryBuildControlledResponse(lastQuestion)

    if (controlledResponse) {
      return Response.json({
        response: controlledResponse
      })
    }

    if (!process.env.GROQ_API_KEY) {
      return Response.json(
        {
          error: 'Falta configurar GROQ_API_KEY en las variables de entorno.'
        },
        { status: 500 }
      )
    }

    const conversation = messages
      .slice(-12)
      .map(message => {
        const label = message.role === 'user'
          ? 'Usuario'
          : 'Agente'

        return `${label}: ${message.content}`
      })
      .join('\n\n')

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: buildSystemContext(),
      prompt: `
Esta es la conversación actual entre el usuario y el agente antifraude.
Responde únicamente al último mensaje del usuario, manteniendo el contexto.

${conversation}
      `.trim(),
      temperature: 0.2,
    })

    return Response.json({
      response: text
    })
  } catch (error) {
    console.error('Error en /api/chat:', error)

    return Response.json(
      {
        error: 'No se pudo generar la respuesta del agente IA.'
      },
      { status: 500 }
    )
  }
}