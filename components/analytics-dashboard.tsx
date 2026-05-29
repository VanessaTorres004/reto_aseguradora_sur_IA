'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  siniestros,
  proveedores,
  getRamos,
  getSucursales,
  dashboardStats
} from '@/lib/data'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap
} from 'recharts'
import {
  TrendingUp,
  BarChart3,
  PieChartIcon,
  Activity,
  Filter
} from 'lucide-react'

const RISK_COLORS = {
  ROJO: '#dc2626',
  AMARILLO: '#f59e0b',
  VERDE: '#16a34a'
}

const CHART_COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#fb923c']

export function AnalyticsDashboard() {
  const [ramoFilter, setRamoFilter] = useState<string>('todos')
  const ramos = getRamos()
  const sucursales = getSucursales()

  // Filter data based on selected ramo
  const filteredSiniestros = ramoFilter === 'todos' 
    ? siniestros 
    : siniestros.filter(s => s.ramo === ramoFilter)

  // Prepare data for charts
  const riskDistribution = [
    { name: 'Alto Riesgo', value: filteredSiniestros.filter(s => s.nivelRiesgo === 'ROJO').length, fill: RISK_COLORS.ROJO },
    { name: 'Riesgo Medio', value: filteredSiniestros.filter(s => s.nivelRiesgo === 'AMARILLO').length, fill: RISK_COLORS.AMARILLO },
    { name: 'Bajo Riesgo', value: filteredSiniestros.filter(s => s.nivelRiesgo === 'VERDE').length, fill: RISK_COLORS.VERDE }
  ]

  const ramoData = ramos.map(ramo => {
    const casos = siniestros.filter(s => s.ramo === ramo)
    return {
      ramo,
      total: casos.length,
      rojos: casos.filter(s => s.nivelRiesgo === 'ROJO').length,
      amarillos: casos.filter(s => s.nivelRiesgo === 'AMARILLO').length,
      verdes: casos.filter(s => s.nivelRiesgo === 'VERDE').length,
      scorePromedio: Math.round(casos.reduce((acc, s) => acc + s.scoreFinal, 0) / casos.length)
    }
  }).sort((a, b) => b.rojos - a.rojos)

  const sucursalData = sucursales.map(suc => {
    const casos = filteredSiniestros.filter(s => s.sucursal === suc)
    return {
      sucursal: suc,
      total: casos.length,
      rojos: casos.filter(s => s.nivelRiesgo === 'ROJO').length,
      amarillos: casos.filter(s => s.nivelRiesgo === 'AMARILLO').length,
      montoTotal: casos.reduce((acc, s) => acc + s.montoReclamado, 0)
    }
  }).sort((a, b) => b.rojos - a.rojos)

  const proveedorData = proveedores
    .filter(p => p.listaRestrictiva || siniestros.some(s => s.idProveedor === p.id && s.nivelRiesgo === 'ROJO'))
    .map(p => {
      const casos = filteredSiniestros.filter(s => s.idProveedor === p.id)
      return {
        nombre: p.nombre.substring(0, 20) + (p.nombre.length > 20 ? '...' : ''),
        servicios: casos.length,
        casosRojos: casos.filter(s => s.nivelRiesgo === 'ROJO').length,
        enLista: p.listaRestrictiva,
        montoTotal: casos.reduce((acc, s) => acc + s.montoReclamado, 0)
      }
    })
    .filter(p => p.servicios > 0)
    .sort((a, b) => b.casosRojos - a.casosRojos)
    .slice(0, 10)

  const scoreDistribution = [
    { rango: '0-20', cantidad: filteredSiniestros.filter(s => s.scoreFinal <= 20).length },
    { rango: '21-40', cantidad: filteredSiniestros.filter(s => s.scoreFinal > 20 && s.scoreFinal <= 40).length },
    { rango: '41-60', cantidad: filteredSiniestros.filter(s => s.scoreFinal > 40 && s.scoreFinal <= 60).length },
    { rango: '61-80', cantidad: filteredSiniestros.filter(s => s.scoreFinal > 60 && s.scoreFinal <= 80).length },
    { rango: '81-100', cantidad: filteredSiniestros.filter(s => s.scoreFinal > 80).length }
  ]

  const coberturaData = [...new Set(filteredSiniestros.map(s => s.cobertura))].map(cob => {
    const casos = filteredSiniestros.filter(s => s.cobertura === cob)
    return {
      cobertura: cob,
      total: casos.length,
      rojos: casos.filter(s => s.nivelRiesgo === 'ROJO').length,
      scorePromedio: Math.round(casos.reduce((acc, s) => acc + s.scoreFinal, 0) / casos.length)
    }
  }).sort((a, b) => b.rojos - a.rojos).slice(0, 8)

  const scatterData = filteredSiniestros.slice(0, 150).map(s => ({
    scoreReglas: s.scoreReglas,
    scoreML: s.scoreML,
    scoreFinal: s.scoreFinal,
    riesgo: s.nivelRiesgo,
    monto: s.montoReclamado
  }))

  const montoVsScoreData = filteredSiniestros.map(s => ({
    monto: s.montoReclamado,
    score: s.scoreFinal,
    riesgo: s.nivelRiesgo
  })).sort((a, b) => a.monto - b.monto)

  const radarData = ramos.map(ramo => {
    const casos = siniestros.filter(s => s.ramo === ramo)
    const rojos = casos.filter(s => s.nivelRiesgo === 'ROJO').length
    const total = casos.length
    return {
      ramo,
      tasaRiesgo: total > 0 ? Math.round((rojos / total) * 100) : 0,
      scorePromedio: Math.round(casos.reduce((acc, s) => acc + s.scoreFinal, 0) / (total || 1)),
      volumen: total
    }
  })

  const alertasTreemap = [
    { name: 'Proveedor Lista', value: filteredSiniestros.filter(s => s.proveedorListaRestrictiva).length, fill: RISK_COLORS.ROJO },
    { name: 'Docs Incompletos', value: filteredSiniestros.filter(s => !s.documentosCompletos).length, fill: RISK_COLORS.AMARILLO },
    { name: 'Similitud Alta', value: filteredSiniestros.filter(s => s.similitudNarrativa > 0.7).length, fill: '#a78bfa' },
    { name: 'Reporte Tardio', value: filteredSiniestros.filter(s => s.diasReporte > 7).length, fill: '#fb923c' },
    { name: 'Reclamos Previos', value: filteredSiniestros.filter(s => s.reclamosPrevios >= 3).length, fill: '#60a5fa' },
    { name: 'Borde Poliza', value: filteredSiniestros.filter(s => s.diasDesdeInicio < 30 || s.diasHastaFin < 30).length, fill: '#34d399' }
  ].filter(a => a.value > 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analitica Avanzada</h1>
          <p className="text-muted-foreground">
            Analisis detallado de patrones de fraude
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={ramoFilter} onValueChange={setRamoFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por ramo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los ramos</SelectItem>
                {ramos.map(ramo => (
                  <SelectItem key={ramo} value={ramo}>{ramo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="text-xs">
            {filteredSiniestros.length} casos
          </Badge>
        </div>
      </div>

      {/* Tabs for different chart categories */}
      <Tabs defaultValue="distribucion" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="distribucion" className="flex items-center gap-2">
            <PieChartIcon className="w-4 h-4" />
            Distribucion
          </TabsTrigger>
          <TabsTrigger value="tendencias" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Tendencias
          </TabsTrigger>
          <TabsTrigger value="comparativas" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Comparativas
          </TabsTrigger>
          <TabsTrigger value="correlaciones" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Correlaciones
          </TabsTrigger>
        </TabsList>

        {/* Distribution Tab */}
        <TabsContent value="distribucion" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Distribution Pie */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribucion por Nivel de Riesgo</CardTitle>
                <CardDescription>
                  Clasificacion de siniestros segun score final
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {riskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Score Distribution Histogram */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Histograma de Scores</CardTitle>
                <CardDescription>
                  Distribucion de casos por rango de score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="rango" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="cantidad" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Alerts Treemap */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Mapa de Alertas por Tipo</CardTitle>
                <CardDescription>
                  Proporcion de alertas detectadas por categoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={alertasTreemap}
                      dataKey="value"
                      nameKey="name"
                      aspectRatio={4/1}
                      stroke="var(--background)"
                      strokeWidth={2}
                    >
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value} casos`, 'Cantidad']}
                      />
                    </Treemap>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-4 mt-4 justify-center">
                  {alertasTreemap.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: item.fill }} />
                      <span>{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="tendencias" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ramo Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Casos por Ramo</CardTitle>
                <CardDescription>
                  Distribucion de alertas por tipo de seguro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ramoData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="ramo" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="rojos" name="Alto Riesgo" stackId="1" fill={RISK_COLORS.ROJO} stroke={RISK_COLORS.ROJO} />
                      <Area type="monotone" dataKey="amarillos" name="Riesgo Medio" stackId="1" fill={RISK_COLORS.AMARILLO} stroke={RISK_COLORS.AMARILLO} />
                      <Area type="monotone" dataKey="verdes" name="Bajo Riesgo" stackId="1" fill={RISK_COLORS.VERDE} stroke={RISK_COLORS.VERDE} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Cobertura Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Coberturas con Alertas</CardTitle>
                <CardDescription>
                  Coberturas con mayor numero de casos de riesgo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={coberturaData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                      <YAxis type="category" dataKey="cobertura" width={120} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="rojos" name="Alto Riesgo" fill={RISK_COLORS.ROJO} stackId="a" />
                      <Bar dataKey="total" name="Total" fill="var(--primary)" stackId="b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Score by Sucursal */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Alertas por Sucursal</CardTitle>
                <CardDescription>
                  Distribucion geografica de casos sospechosos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sucursalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="sucursal" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="rojos" name="Alto Riesgo" fill={RISK_COLORS.ROJO} />
                      <Bar dataKey="amarillos" name="Riesgo Medio" fill={RISK_COLORS.AMARILLO} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comparisons Tab */}
        <TabsContent value="comparativas" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Provider Analysis */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Proveedores con Alertas</CardTitle>
                <CardDescription>
                  Proveedores con mayor concentracion de casos sospechosos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={proveedorData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                      <YAxis type="category" dataKey="nombre" width={150} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="casosRojos" name="Casos Alto Riesgo" fill={RISK_COLORS.ROJO} />
                      <Bar dataKey="servicios" name="Total Servicios" fill="var(--primary)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Perfil de Riesgo por Ramo</CardTitle>
                <CardDescription>
                  Comparacion multidimensional de indicadores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="ramo" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                      <PolarRadiusAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                      <Radar name="Tasa Riesgo %" dataKey="tasaRiesgo" stroke={RISK_COLORS.ROJO} fill={RISK_COLORS.ROJO} fillOpacity={0.3} />
                      <Radar name="Score Promedio" dataKey="scorePromedio" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.3} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Score vs Ramo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Score Promedio por Ramo</CardTitle>
                <CardDescription>
                  Comparacion de scores entre tipos de seguro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ramoData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="ramo" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="scorePromedio" name="Score Promedio" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                        {ramoData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.scorePromedio > 60 ? RISK_COLORS.ROJO : entry.scorePromedio > 40 ? RISK_COLORS.AMARILLO : RISK_COLORS.VERDE} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Correlations Tab */}
        <TabsContent value="correlaciones" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rules vs ML Scatter */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Score Reglas vs Score ML</CardTitle>
                <CardDescription>
                  Correlacion entre modelos de deteccion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        type="number"
                        dataKey="scoreReglas"
                        name="Score Reglas"
                        domain={[0, 100]}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                        label={{ value: 'Score Reglas', position: 'bottom', fill: 'var(--muted-foreground)', offset: -5 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="scoreML"
                        name="Score ML"
                        domain={[0, 100]}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                        label={{ value: 'Score ML', angle: -90, position: 'insideLeft', fill: 'var(--muted-foreground)' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}
                        cursor={{ strokeDasharray: '3 3' }}
                      />
                      <Scatter name="Siniestros" data={scatterData}>
                        {scatterData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.riesgo]} opacity={0.7} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Monto vs Score */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monto vs Score de Riesgo</CardTitle>
                <CardDescription>
                  Relacion entre monto reclamado y nivel de sospecha
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        type="number"
                        dataKey="monto"
                        name="Monto"
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                        tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                        label={{ value: 'Monto Reclamado', position: 'bottom', fill: 'var(--muted-foreground)', offset: -5 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="score"
                        name="Score"
                        domain={[0, 100]}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                        label={{ value: 'Score Final', angle: -90, position: 'insideLeft', fill: 'var(--muted-foreground)' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number, name: string) => [
                          name === 'Monto' ? `$${value.toLocaleString()}` : value,
                          name
                        ]}
                      />
                      <Scatter name="Siniestros" data={montoVsScoreData.slice(0, 200)}>
                        {montoVsScoreData.slice(0, 200).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.riesgo]} opacity={0.6} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Model Weights Info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Metodologia de Scoring Hibrido</CardTitle>
                <CardDescription>
                  Pesos y componentes del score final
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted text-center">
                    <div className="text-3xl font-bold text-primary">40%</div>
                    <div className="text-sm font-medium mt-1">Reglas de Negocio</div>
                    <div className="text-xs text-muted-foreground mt-1">RF-01 a RF-07</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted text-center">
                    <div className="text-3xl font-bold text-primary">35%</div>
                    <div className="text-sm font-medium mt-1">Machine Learning</div>
                    <div className="text-xs text-muted-foreground mt-1">Random Forest</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted text-center">
                    <div className="text-3xl font-bold text-primary">15%</div>
                    <div className="text-sm font-medium mt-1">Deteccion Anomalias</div>
                    <div className="text-xs text-muted-foreground mt-1">Isolation Forest</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted text-center">
                    <div className="text-3xl font-bold text-primary">10%</div>
                    <div className="text-sm font-medium mt-1">NLP / Similitud</div>
                    <div className="text-xs text-muted-foreground mt-1">TF-IDF + Cosine</div>
                  </div>
                </div>
                <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    <strong>Clasificacion:</strong> Score 0-40 = Verde (flujo normal) | Score 41-75 = Amarillo (revision documental) | Score 76-100 = Rojo (revision especializada)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
