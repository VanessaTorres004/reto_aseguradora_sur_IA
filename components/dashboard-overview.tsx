'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  DollarSign,
  FileWarning,
  Building2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { dashboardStats, siniestros, proveedores, getRamos, getSucursales } from '@/lib/data'
import type { RiskLevel } from '@/lib/data'
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
  CartesianGrid
} from 'recharts'

const RISK_COLORS = {
  ROJO: '#dc2626',
  AMARILLO: '#f59e0b',
  VERDE: '#16a34a'
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  variant = 'default'
}: {
  title: string
  value: string | number
  description?: string
  icon: React.ElementType
  trend?: 'up' | 'down'
  trendValue?: string
  variant?: 'default' | 'danger' | 'warning' | 'success'
}) {
  const variantStyles = {
    default: 'bg-card',
    danger: 'bg-[var(--risk-high)]/10 border-[var(--risk-high)]/20',
    warning: 'bg-[var(--risk-medium)]/10 border-[var(--risk-medium)]/20',
    success: 'bg-[var(--risk-low)]/10 border-[var(--risk-low)]/20'
  }

  const iconStyles = {
    default: 'text-primary',
    danger: 'text-[var(--risk-high)]',
    warning: 'text-[var(--risk-medium)]',
    success: 'text-[var(--risk-low)]'
  }

  return (
    <Card className={variantStyles[variant]}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`w-5 h-5 ${iconStyles[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {trend && trendValue && (
            <span
              className={`flex items-center text-xs ${
                trend === 'up' ? 'text-[var(--risk-high)]' : 'text-[var(--risk-low)]'
              }`}
            >
              {trend === 'up' ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {trendValue}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const config = {
    ROJO: { label: 'Alto Riesgo', className: 'bg-[var(--risk-high)] text-white', icon: AlertTriangle },
    AMARILLO: { label: 'Riesgo Medio', className: 'bg-[var(--risk-medium)] text-black', icon: AlertCircle },
    VERDE: { label: 'Bajo Riesgo', className: 'bg-[var(--risk-low)] text-white', icon: CheckCircle }
  }

  const { label, className, icon: Icon } = config[level]

  return (
    <Badge className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  )
}

export function DashboardOverview() {
  // Preparar datos para gráficos
  const riskDistribution = [
    { name: 'Alto Riesgo', value: dashboardStats.casosRojos, fill: RISK_COLORS.ROJO },
    { name: 'Riesgo Medio', value: dashboardStats.casosAmarillos, fill: RISK_COLORS.AMARILLO },
    { name: 'Bajo Riesgo', value: dashboardStats.casosVerdes, fill: RISK_COLORS.VERDE }
  ]

  const top10Cases = siniestros.slice(0, 10).map(s => ({
    id: s.id,
    score: s.scoreFinal,
    riesgo: s.nivelRiesgo
  }))

  const sucursalData = getSucursales().map(suc => {
    const casosRojos = siniestros.filter(s => s.sucursal === suc && s.nivelRiesgo === 'ROJO').length
    const casosAmarillos = siniestros.filter(s => s.sucursal === suc && s.nivelRiesgo === 'AMARILLO').length
    return { sucursal: suc, rojos: casosRojos, amarillos: casosAmarillos }
  }).sort((a, b) => b.rojos - a.rojos)

  const scatterData = siniestros.slice(0, 100).map(s => ({
    scoreReglas: s.scoreReglas,
    scoreML: s.scoreML,
    riesgo: s.nivelRiesgo
  }))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-balance">Dashboard Antifraude</h1>
          <p className="text-muted-foreground">
            Monitoreo de siniestros - Aseguradora del Sur
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          hackIAthon 2026
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Casos Alto Riesgo"
          value={dashboardStats.casosRojos}
          description="Requieren revision especializada"
          icon={AlertTriangle}
          variant="danger"
          trend="up"
          trendValue="+15%"
        />
        <StatCard
          title="Casos Riesgo Medio"
          value={dashboardStats.casosAmarillos}
          description="Revision documental"
          icon={AlertCircle}
          variant="warning"
        />
        <StatCard
          title="Casos Bajo Riesgo"
          value={dashboardStats.casosVerdes}
          description="Flujo normal"
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Score Promedio"
          value={dashboardStats.scorePromedio}
          description="Sobre 100 puntos"
          icon={TrendingUp}
        />
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Siniestros"
          value={dashboardStats.totalSiniestros}
          description="Casos analizados"
          icon={FileWarning}
        />
        <StatCard
          title="Monto Reclamado"
          value={`$${(dashboardStats.montoTotalReclamado / 1000000).toFixed(1)}M`}
          description="Monto total en revision"
          icon={DollarSign}
        />
        <StatCard
          title="Proveedores en Lista"
          value={dashboardStats.proveedoresEnLista}
          description="Lista restrictiva"
          icon={Building2}
          variant="warning"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribucion de Riesgo</CardTitle>
            <CardDescription>
              Clasificacion de siniestros por nivel de riesgo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
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

        {/* Top 10 Cases Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 10 Casos por Score</CardTitle>
            <CardDescription>
              Siniestros con mayor puntuacion de riesgo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10Cases} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="id"
                    width={80}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar
                    dataKey="score"
                    name="Score Final"
                    radius={[0, 4, 4, 0]}
                  >
                    {top10Cases.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.riesgo]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cases by Branch */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alertas por Sucursal</CardTitle>
            <CardDescription>
              Distribucion de casos de riesgo por ubicacion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sucursalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="sucursal"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="rojos" name="Alto Riesgo" fill={RISK_COLORS.ROJO} stackId="a" />
                  <Bar dataKey="amarillos" name="Riesgo Medio" fill={RISK_COLORS.AMARILLO} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Score Rules vs ML Scatter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Score Reglas vs ML</CardTitle>
            <CardDescription>
              Correlacion entre modelos de deteccion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    type="number"
                    dataKey="scoreReglas"
                    name="Score Reglas"
                    domain={[0, 100]}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    label={{ value: 'Score Reglas', position: 'bottom', fill: 'var(--muted-foreground)' }}
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
                  <Scatter
                    name="Siniestros"
                    data={scatterData}
                    fill="var(--primary)"
                  >
                    {scatterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.riesgo]} opacity={0.7} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent High Risk Cases */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Casos Criticos Recientes</CardTitle>
          <CardDescription>
            Siniestros que requieren atencion inmediata
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {siniestros.slice(0, 5).map((caso) => (
              <div
                key={caso.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-2 h-12 rounded-full"
                    style={{ backgroundColor: RISK_COLORS[caso.nivelRiesgo] }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{caso.id}</span>
                      <RiskBadge level={caso.nivelRiesgo} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {caso.ramo} - {caso.cobertura} | {caso.sucursal}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md truncate">
                      {caso.alertas[0]}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{caso.scoreFinal}</div>
                  <div className="text-xs text-muted-foreground">Score Final</div>
                  <div className="text-sm font-medium mt-1">
                    ${caso.montoReclamado.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border">
        <p className="text-xs text-muted-foreground text-center">
          <strong>Nota importante:</strong> Este sistema genera alertas de revision, NO acusaciones de fraude.
          Toda decision requiere revision humana especializada. Los scores son orientativos y se basan en datos sinteticos.
        </p>
      </div>
    </div>
  )
}
