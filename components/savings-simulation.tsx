'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import {
  TrendingDown,
  DollarSign,
  Shield,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle,
  Printer,
  BarChart3,
  Target,
} from 'lucide-react'
import { siniestros, proveedores, dashboardStats } from '@/lib/data'

// --- Simulation Engine ---
function computeSavings(params: {
  detectionRateRojo: number      // 0-100 %
  detectionRateAmarillo: number
  fraudRateRojo: number          // estimated actual fraud % among ROJO
  fraudRateAmarillo: number
  avgRecoveryRate: number        // % of fraudulent amount recovered
}) {
  const { detectionRateRojo, detectionRateAmarillo, fraudRateRojo, fraudRateAmarillo, avgRecoveryRate } = params

  const rojos = siniestros.filter(s => s.nivelRiesgo === 'ROJO')
  const amarillos = siniestros.filter(s => s.nivelRiesgo === 'AMARILLO')

  const montoRojos = rojos.reduce((a, s) => a + s.montoReclamado, 0)
  const montoAmarillos = amarillos.reduce((a, s) => a + s.montoReclamado, 0)

  const detectedRojos = Math.round(rojos.length * (detectionRateRojo / 100))
  const detectedAmarillos = Math.round(amarillos.length * (detectionRateAmarillo / 100))

  const fraudAmountRojos = montoRojos * (fraudRateRojo / 100) * (detectionRateRojo / 100)
  const fraudAmountAmarillos = montoAmarillos * (fraudRateAmarillo / 100) * (detectionRateAmarillo / 100)

  const totalFraudDetected = fraudAmountRojos + fraudAmountAmarillos
  const totalSavings = totalFraudDetected * (avgRecoveryRate / 100)

  const costInvestigation = (detectedRojos * 450) + (detectedAmarillos * 150) // avg cost per review
  const roi = costInvestigation > 0 ? ((totalSavings - costInvestigation) / costInvestigation) * 100 : 0

  return {
    detectedRojos,
    detectedAmarillos,
    fraudAmountRojos,
    fraudAmountAmarillos,
    totalFraudDetected,
    totalSavings,
    costInvestigation,
    roi,
    savingsNet: totalSavings - costInvestigation,
  }
}

// Build chart data for savings over detection rate range
function buildSensitivityData(
  fraudRateRojo: number,
  fraudRateAmarillo: number,
  recoveryRate: number
) {
  return Array.from({ length: 11 }, (_, i) => {
    const rate = i * 10
    const result = computeSavings({
      detectionRateRojo: rate,
      detectionRateAmarillo: Math.max(rate - 10, 0),
      fraudRateRojo,
      fraudRateAmarillo,
      avgRecoveryRate: recoveryRate,
    })
    return {
      deteccion: `${rate}%`,
      'Ahorro Bruto': Math.round(result.totalSavings / 1000),
      'Ahorro Neto': Math.round(result.savingsNet / 1000),
      'Costo Revisión': Math.round(result.costInvestigation / 1000),
    }
  })
}

// Build monthly projection
function buildMonthlyProjection(annualSavings: number) {
  const base = annualSavings / 12
  return Array.from({ length: 12 }, (_, i) => {
    const month = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][i]
    const growth = 1 + i * 0.03 // 3% monthly improvement
    return {
      mes: month,
      ahorro: Math.round(base * growth / 1000),
    }
  })
}

// Generate audit report text
function generateAuditReport(params: ReturnType<typeof computeSavings> & {
  detectionRateRojo: number
  detectionRateAmarillo: number
  fraudRateRojo: number
  fraudRateAmarillo: number
  recoveryRate: number
}): string {
  const now = new Date().toLocaleDateString('es-ES', { dateStyle: 'full' })
  const lines = [
    '============================================================',
    '        REPORTE DE AUDITORÍA — SISTEMA ANTIFRAUDE',
    '        Aseguradora del Sur — Unidad de Control de Fraude',
    '============================================================',
    `Fecha de generación: ${now}`,
    `Período de análisis: Ejercicio 2025`,
    '',
    '------------------------------------------------------------',
    '1. RESUMEN EJECUTIVO',
    '------------------------------------------------------------',
    `Total siniestros evaluados:     ${dashboardStats.totalSiniestros}`,
    `Casos clasificados ROJO:        ${dashboardStats.casosRojos} (${((dashboardStats.casosRojos / dashboardStats.totalSiniestros) * 100).toFixed(1)}%)`,
    `Casos clasificados AMARILLO:    ${dashboardStats.casosAmarillos} (${((dashboardStats.casosAmarillos / dashboardStats.totalSiniestros) * 100).toFixed(1)}%)`,
    `Casos clasificados VERDE:       ${dashboardStats.casosVerdes} (${((dashboardStats.casosVerdes / dashboardStats.totalSiniestros) * 100).toFixed(1)}%)`,
    `Score promedio del dataset:     ${dashboardStats.scorePromedio} / 100`,
    `Monto total reclamado:          $${dashboardStats.montoTotalReclamado.toLocaleString()}`,
    `Proveedores en lista restrictiva: ${dashboardStats.proveedoresEnLista}`,
    '',
    '------------------------------------------------------------',
    '2. PARÁMETROS DE SIMULACIÓN UTILIZADOS',
    '------------------------------------------------------------',
    `Tasa de detección casos ROJO:    ${params.detectionRateRojo}%`,
    `Tasa de detección casos AMARILLO: ${params.detectionRateAmarillo}%`,
    `Tasa estimada de fraude real ROJO: ${params.fraudRateRojo}%`,
    `Tasa estimada de fraude real AMARILLO: ${params.fraudRateAmarillo}%`,
    `Tasa de recuperación estimada:   ${params.recoveryRate}%`,
    '',
    '------------------------------------------------------------',
    '3. RESULTADOS DE SIMULACIÓN DE AHORRO',
    '------------------------------------------------------------',
    `Casos ROJO detectados:          ${params.detectedRojos}`,
    `Casos AMARILLO detectados:      ${params.detectedAmarillos}`,
    `Monto en riesgo (ROJO):         $${Math.round(params.fraudAmountRojos).toLocaleString()}`,
    `Monto en riesgo (AMARILLO):     $${Math.round(params.fraudAmountAmarillos).toLocaleString()}`,
    `Total fraude potencial detectado: $${Math.round(params.totalFraudDetected).toLocaleString()}`,
    `Ahorro bruto estimado:          $${Math.round(params.totalSavings).toLocaleString()}`,
    `Costo de investigación:         $${Math.round(params.costInvestigation).toLocaleString()}`,
    `AHORRO NETO ESTIMADO:           $${Math.round(params.savingsNet).toLocaleString()}`,
    `ROI del programa:               ${params.roi.toFixed(1)}%`,
    '',
    '------------------------------------------------------------',
    '4. TOP 10 CASOS PRIORITARIOS PARA AUDITORÍA',
    '------------------------------------------------------------',
    ...siniestros.slice(0, 10).map((s, i) =>
      `${String(i + 1).padStart(2, ' ')}. ${s.id}  Score: ${s.scoreFinal}/100 (${s.nivelRiesgo})  $${s.montoReclamado.toLocaleString()}  ${s.ramo}`
    ),
    '',
    '------------------------------------------------------------',
    '5. PROVEEDORES EN LISTA RESTRICTIVA CON CASOS ACTIVOS',
    '------------------------------------------------------------',
    ...proveedores.filter(p => p.listaRestrictiva).map(p => {
      const casos = siniestros.filter(s => s.idProveedor === p.id).length
      return `  • ${p.nombre} (${p.ciudad}) — ${casos} casos — Motivo: ${p.motivoLista}`
    }),
    '',
    '------------------------------------------------------------',
    '6. ALERTAS MÁS FRECUENTES',
    '------------------------------------------------------------',
    `  • Monto atípico vs. suma asegurada: ${siniestros.filter(s => s.montoReclamado / s.sumaAsegurada >= 0.95).length} casos`,
    `  • Proveedor en lista restrictiva:  ${siniestros.filter(s => s.proveedorListaRestrictiva).length} casos`,
    `  • Documentación incompleta:        ${siniestros.filter(s => !s.documentosCompletos).length} casos`,
    `  • Siniestro al borde de vigencia:  ${siniestros.filter(s => s.diasDesdeInicio < 30 || s.diasHastaFin < 30).length} casos`,
    `  • Alta frecuencia de reclamos:     ${siniestros.filter(s => s.reclamosPrevios >= 3).length} casos`,
    `  • Narrativa con similitud alta:    ${siniestros.filter(s => s.similitudNarrativa > 0.7).length} casos`,
    '',
    '------------------------------------------------------------',
    '7. AVISO LEGAL',
    '------------------------------------------------------------',
    'Este reporte ha sido generado de forma automatizada por el Sistema de',
    'Detección de Fraude. Las alertas y proyecciones aquí descritas son',
    'indicativas y requieren validación por parte del equipo humano de la',
    'Unidad Antifraude antes de tomar cualquier decisión.',
    '',
    'El sistema NO realiza acusaciones de fraude. Su función es priorizar',
    'la revisión humana de casos con indicadores de riesgo elevado.',
    '',
    '============================================================',
    `Reporte generado el ${now}`,
    'Sistema Antifraude v2.0 — Aseguradora del Sur',
    '============================================================',
  ]
  return lines.join('\n')
}

export function SavingsSimulation() {
  const [detRojo, setDetRojo] = useState(80)
  const [detAmarillo, setDetAmarillo] = useState(60)
  const [fraudRojo, setFraudRojo] = useState(65)
  const [fraudAmarillo, setFraudAmarillo] = useState(25)
  const [recovery, setRecovery] = useState(70)

  const result = useMemo(() => computeSavings({
    detectionRateRojo: detRojo,
    detectionRateAmarillo: detAmarillo,
    fraudRateRojo: fraudRojo,
    fraudRateAmarillo: fraudAmarillo,
    avgRecoveryRate: recovery,
  }), [detRojo, detAmarillo, fraudRojo, fraudAmarillo, recovery])

  const sensitivityData = useMemo(
    () => buildSensitivityData(fraudRojo, fraudAmarillo, recovery),
    [fraudRojo, fraudAmarillo, recovery]
  )

  const monthlyData = useMemo(() => buildMonthlyProjection(result.savingsNet), [result.savingsNet])

  const handleDownloadReport = () => {
    const report = generateAuditReport({
      ...result,
      detectionRateRojo: detRojo,
      detectionRateAmarillo: detAmarillo,
      fraudRateRojo: fraudRojo,
      fraudRateAmarillo: fraudAmarillo,
      recoveryRate: recovery,
    })
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-auditoria-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadCSV = () => {
    const headers = ['ID', 'Ramo', 'Cobertura', 'Score', 'Nivel', 'Monto Reclamado', 'Monto Estimado', 'Proveedor', 'Alertas']
    const rows = siniestros.slice(0, 100).map(s => {
      const prov = proveedores.find(p => p.id === s.idProveedor)
      return [
        s.id,
        s.ramo,
        s.cobertura,
        s.scoreFinal,
        s.nivelRiesgo,
        s.montoReclamado,
        s.montoEstimado,
        prov?.nombre || s.idProveedor,
        `"${s.alertas.join(' | ')}"`
      ].join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `siniestros-prioritarios-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const kpiColor = result.savingsNet > 0 ? 'text-emerald-600' : 'text-red-600'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-primary" />
            Simulación de Ahorro
          </h1>
          <p className="text-muted-foreground text-sm">
            Proyección del impacto económico del programa antifraude y exportación de reporte de auditoría
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
          <Button onClick={handleDownloadReport} className="gap-2">
            <FileText className="w-4 h-4" />
            Reporte Auditoría
          </Button>
        </div>
      </div>

      <Tabs defaultValue="simulacion" className="space-y-6">
        <TabsList>
          <TabsTrigger value="simulacion" className="gap-2">
            <Target className="w-4 h-4" />
            Simulación
          </TabsTrigger>
          <TabsTrigger value="proyeccion" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Proyección Mensual
          </TabsTrigger>
          <TabsTrigger value="reporte" className="gap-2">
            <Printer className="w-4 h-4" />
            Vista Previa Reporte
          </TabsTrigger>
        </TabsList>

        {/* SIMULATION TAB */}
        <TabsContent value="simulacion" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Parameters */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Parámetros del Modelo</CardTitle>
                <CardDescription>Ajusta los supuestos para calcular el ahorro estimado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Detección casos ROJO</span>
                    <span className="font-medium text-red-600">{detRojo}%</span>
                  </div>
                  <Slider value={[detRojo]} onValueChange={([v]) => setDetRojo(v)} min={0} max={100} step={5} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Detección casos AMARILLO</span>
                    <span className="font-medium text-amber-600">{detAmarillo}%</span>
                  </div>
                  <Slider value={[detAmarillo]} onValueChange={([v]) => setDetAmarillo(v)} min={0} max={100} step={5} />
                </div>
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Fraude real en ROJO (estimado)</span>
                    <span className="font-medium">{fraudRojo}%</span>
                  </div>
                  <Slider value={[fraudRojo]} onValueChange={([v]) => setFraudRojo(v)} min={0} max={100} step={5} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Fraude real en AMARILLO (estimado)</span>
                    <span className="font-medium">{fraudAmarillo}%</span>
                  </div>
                  <Slider value={[fraudAmarillo]} onValueChange={([v]) => setFraudAmarillo(v)} min={0} max={100} step={5} />
                </div>
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tasa de recuperación</span>
                    <span className="font-medium text-emerald-600">{recovery}%</span>
                  </div>
                  <Slider value={[recovery]} onValueChange={([v]) => setRecovery(v)} min={0} max={100} step={5} />
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-4 content-start">
              <Card className="col-span-2 p-5 bg-primary/5 border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Ahorro Neto Estimado</div>
                    <div className={`text-4xl font-bold mt-1 ${kpiColor}`}>
                      ${Math.round(result.savingsNet / 1000).toLocaleString()}K
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Ahorro bruto: ${Math.round(result.totalSavings / 1000).toLocaleString()}K — Costo revisión: ${Math.round(result.costInvestigation / 1000).toLocaleString()}K
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">ROI del Programa</div>
                    <div className={`text-3xl font-bold mt-1 ${result.roi > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {result.roi.toFixed(0)}%
                    </div>
                  </div>
                </div>
                <Progress
                  value={Math.min(Math.max(result.roi, 0), 500) / 5}
                  className="h-2 mt-4 [&>div]:bg-emerald-500"
                />
              </Card>

              {[
                { label: 'Casos ROJO revisados', value: result.detectedRojos, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
                { label: 'Casos AMARILLO revisados', value: result.detectedAmarillos, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
                { label: 'Fraude detectado (ROJO)', value: `$${Math.round(result.fraudAmountRojos / 1000).toLocaleString()}K`, icon: DollarSign, color: 'text-red-600 bg-red-50' },
                { label: 'Fraude detectado (AMar)', value: `$${Math.round(result.fraudAmountAmarillos / 1000).toLocaleString()}K`, icon: DollarSign, color: 'text-amber-600 bg-amber-50' },
              ].map((kpi, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpi.color}`}>
                      <kpi.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xl font-bold">{kpi.value}</div>
                      <div className="text-xs text-muted-foreground">{kpi.label}</div>
                    </div>
                  </div>
                </Card>
              ))}

              {/* Sensitivity Chart */}
              <Card className="col-span-2 p-4">
                <div className="text-sm font-medium mb-3">Sensibilidad del Ahorro a la Tasa de Detección (miles $)</div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sensitivityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="deteccion" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="Ahorro Bruto" fill="#bbf7d0" stroke="#16a34a" />
                      <Area type="monotone" dataKey="Ahorro Neto" fill="#86efac" stroke="#15803d" />
                      <Area type="monotone" dataKey="Costo Revisión" fill="#fecaca" stroke="#dc2626" />
                      <ReferenceLine x={`${detRojo}%`} stroke="var(--primary)" strokeDasharray="4 2" label={{ value: 'Actual', fill: 'var(--primary)', fontSize: 11 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* MONTHLY PROJECTION TAB */}
        <TabsContent value="proyeccion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Proyección Mensual de Ahorro</CardTitle>
              <CardDescription>Asumiendo mejora continua del modelo del 3% mensual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="mes" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} unit="K" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      formatter={(v: number) => [`$${v}K`, 'Ahorro neto']}
                    />
                    <Bar dataKey="ahorro" name="Ahorro neto ($K)" radius={[4, 4, 0, 0]}>
                      {monthlyData.map((_, i) => (
                        <Cell key={i} fill={`hsl(${142 + i * 2}, ${60 + i}%, ${40 + i}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-emerald-600">
                    ${Math.round(result.savingsNet / 1000).toLocaleString()}K
                  </div>
                  <div className="text-xs text-muted-foreground">Ahorro neto anual</div>
                </div>
                <div>
                  <div className="text-xl font-bold">
                    ${Math.round(result.savingsNet / 12 / 1000).toLocaleString()}K
                  </div>
                  <div className="text-xs text-muted-foreground">Promedio mensual</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-emerald-600">
                    {result.roi.toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">ROI estimado</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Impacto por Nivel de Riesgo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { nivel: 'ROJO', casos: dashboardStats.casosRojos, monto: siniestros.filter(s => s.nivelRiesgo === 'ROJO').reduce((a, s) => a + s.montoReclamado, 0), color: 'bg-red-500' },
                  { nivel: 'AMARILLO', casos: dashboardStats.casosAmarillos, monto: siniestros.filter(s => s.nivelRiesgo === 'AMARILLO').reduce((a, s) => a + s.montoReclamado, 0), color: 'bg-amber-500' },
                  { nivel: 'VERDE', casos: dashboardStats.casosVerdes, monto: siniestros.filter(s => s.nivelRiesgo === 'VERDE').reduce((a, s) => a + s.montoReclamado, 0), color: 'bg-emerald-500' },
                ].map(row => (
                  <div key={row.nivel} className="flex items-center gap-4">
                    <Badge variant={row.nivel === 'ROJO' ? 'destructive' : row.nivel === 'AMARILLO' ? 'secondary' : 'outline'} className="w-20 justify-center">
                      {row.nivel}
                    </Badge>
                    <div className="flex-1">
                      <Progress value={(row.casos / dashboardStats.totalSiniestros) * 100} className={`h-2 [&>div]:${row.color}`} />
                    </div>
                    <div className="text-sm text-right w-28">
                      <span className="font-medium">{row.casos}</span>
                      <span className="text-muted-foreground"> casos</span>
                    </div>
                    <div className="text-sm text-right w-28 text-muted-foreground">
                      ${(row.monto / 1_000_000).toFixed(1)}M
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REPORT PREVIEW TAB */}
        <TabsContent value="reporte" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Vista Previa — Reporte de Auditoría
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Este reporte se genera dinámicamente con los parámetros de simulación actuales
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadCSV} className="gap-2">
                <Download className="w-4 h-4" />
                CSV
              </Button>
              <Button size="sm" onClick={handleDownloadReport} className="gap-2">
                <Download className="w-4 h-4" />
                Descargar .txt
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <pre className="text-xs leading-relaxed overflow-auto p-6 font-mono text-foreground/80 max-h-[600px]">
                {generateAuditReport({
                  ...result,
                  detectionRateRojo: detRojo,
                  detectionRateAmarillo: detAmarillo,
                  fraudRateRojo: fraudRojo,
                  fraudRateAmarillo: fraudAmarillo,
                  recoveryRate: recovery,
                })}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
