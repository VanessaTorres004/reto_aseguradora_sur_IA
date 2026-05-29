'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  Building2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  MapPin,
  Search,
  Shield,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { siniestros, proveedores } from '@/lib/data'
import type { Proveedor } from '@/lib/data'

interface ProveedorEnriquecido extends Proveedor {
  totalCasos: number
  casosRojos: number
  casosAmarillos: number
  casosVerdes: number
  montoTotal: number
  scorePromedio: number
  tasaRiesgo: number
  rankScore: number
}

function buildProveedorData(): ProveedorEnriquecido[] {
  return proveedores
    .map(p => {
      const casos = siniestros.filter(s => s.idProveedor === p.id)
      const rojos = casos.filter(s => s.nivelRiesgo === 'ROJO').length
      const amarillos = casos.filter(s => s.nivelRiesgo === 'AMARILLO').length
      const verdes = casos.filter(s => s.nivelRiesgo === 'VERDE').length
      const montoTotal = casos.reduce((acc, s) => acc + s.montoReclamado, 0)
      const scorePromedio = casos.length > 0
        ? Math.round(casos.reduce((acc, s) => acc + s.scoreFinal, 0) / casos.length)
        : 0
      const tasaRiesgo = casos.length > 0 ? Math.round((rojos / casos.length) * 100) : 0
      // Composite rank: weight rojos heavily, add lista restrictiva boost, monto boost
      const rankScore = rojos * 3 + amarillos * 1.5 + (p.listaRestrictiva ? 30 : 0) + scorePromedio * 0.5

      return {
        ...p,
        totalCasos: casos.length,
        casosRojos: rojos,
        casosAmarillos: amarillos,
        casosVerdes: verdes,
        montoTotal,
        scorePromedio,
        tasaRiesgo,
        rankScore,
      }
    })
    .filter(p => p.totalCasos > 0)
    .sort((a, b) => b.rankScore - a.rankScore)
}

const TIPOS_PROVEEDOR = ['Todos', 'Taller Automotriz', 'Clínica', 'Hospital', 'Laboratorio', 'Centro Diagnóstico', 'Farmacia']
const CIUDADES = ['Todas', 'Quito', 'Guayaquil', 'Cuenca', 'Ambato', 'Loja', 'Manta', 'Machala', 'Riobamba', 'Ibarra', 'Esmeraldas']

export function ProviderRanking() {
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState('Todos')
  const [ciudadFilter, setCiudadFilter] = useState('Todas')
  const [listaFilter, setListaFilter] = useState<'todos' | 'lista' | 'limpio'>('todos')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const allData = buildProveedorData()

  const filtered = allData.filter(p => {
    if (search && !p.nombre.toLowerCase().includes(search.toLowerCase())) return false
    if (tipoFilter !== 'Todos' && p.tipo !== tipoFilter) return false
    if (ciudadFilter !== 'Todas' && p.ciudad !== ciudadFilter) return false
    if (listaFilter === 'lista' && !p.listaRestrictiva) return false
    if (listaFilter === 'limpio' && p.listaRestrictiva) return false
    return true
  })

  const top10Chart = allData.slice(0, 10).map(p => ({
    nombre: p.nombre.length > 18 ? p.nombre.substring(0, 18) + '…' : p.nombre,
    Rojos: p.casosRojos,
    Amarillos: p.casosAmarillos,
    Verdes: p.casosVerdes,
    enLista: p.listaRestrictiva,
  }))

  const getRankBadge = (index: number, p: ProveedorEnriquecido) => {
    if (p.listaRestrictiva) return (
      <Badge variant="destructive" className="text-xs gap-1">
        <ShieldAlert className="w-3 h-3" />
        Lista Restrictiva
      </Badge>
    )
    if (index < 3) return <Badge variant="destructive" className="text-xs">Alto Riesgo</Badge>
    if (p.tasaRiesgo > 20) return <Badge variant="secondary" className="text-xs">Riesgo Elevado</Badge>
    return <Badge variant="outline" className="text-xs">Monitoreo</Badge>
  }

  const totalMonto = allData.reduce((acc, p) => acc + p.montoTotal, 0)
  const totalRojos = allData.reduce((acc, p) => acc + p.casosRojos, 0)
  const enLista = allData.filter(p => p.listaRestrictiva).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" />
          Ranking de Proveedores
        </h1>
        <p className="text-muted-foreground text-sm">
          Concentración de alertas y score de riesgo por proveedor
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{allData.length}</div>
              <div className="text-xs text-muted-foreground">Proveedores activos</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{enLista}</div>
              <div className="text-xs text-muted-foreground">En lista restrictiva</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{totalRojos}</div>
              <div className="text-xs text-muted-foreground">Casos rojos asociados</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">${(totalMonto / 1_000_000).toFixed(1)}M</div>
              <div className="text-xs text-muted-foreground">Monto total gestionado</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top 10 Proveedores por Concentración de Alertas</CardTitle>
          <CardDescription>Distribución de casos por nivel de riesgo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10Chart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                <YAxis type="category" dataKey="nombre" width={160} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="Rojos" fill="#dc2626" stackId="a" />
                <Bar dataKey="Amarillos" fill="#f59e0b" stackId="a" />
                <Bar dataKey="Verdes" fill="#16a34a" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar proveedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_PROVEEDOR.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={ciudadFilter} onValueChange={setCiudadFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CIUDADES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          {(['todos', 'lista', 'limpio'] as const).map(v => (
            <Button
              key={v}
              variant={listaFilter === v ? 'default' : 'outline'}
              size="sm"
              onClick={() => setListaFilter(v)}
              className="text-xs"
            >
              {v === 'todos' ? 'Todos' : v === 'lista' ? 'En Lista' : 'Sin Alertas'}
            </Button>
          ))}
        </div>
        <Badge variant="outline" className="ml-auto">{filtered.length} proveedores</Badge>
      </div>

      {/* Ranking List */}
      <div className="space-y-3">
        {filtered.map((p, index) => {
          const isExpanded = expandedId === p.id
          const globalRank = allData.findIndex(a => a.id === p.id) + 1

          return (
            <Card
              key={p.id}
              className={cn(
                'overflow-hidden transition-all',
                p.listaRestrictiva && 'border-red-200 bg-red-50/30'
              )}
            >
              <div
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : p.id)}
              >
                {/* Rank */}
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                  globalRank === 1 ? 'bg-red-100 text-red-700' :
                  globalRank === 2 ? 'bg-orange-100 text-orange-700' :
                  globalRank === 3 ? 'bg-amber-100 text-amber-700' :
                  'bg-muted text-muted-foreground'
                )}>
                  {globalRank}
                </div>

                {/* Icon */}
                <div className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                  p.listaRestrictiva ? 'bg-red-100' : 'bg-primary/10'
                )}>
                  {p.listaRestrictiva
                    ? <ShieldAlert className="w-4 h-4 text-red-600" />
                    : <Building2 className="w-4 h-4 text-primary" />}
                </div>

                {/* Name & meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{p.nombre}</span>
                    {getRankBadge(globalRank - 1, p)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {p.ciudad}
                    </span>
                    <span>{p.tipo}</span>
                    <span>{p.totalCasos} casos</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-center hidden sm:block">
                    <div className="text-lg font-bold text-red-600">{p.casosRojos}</div>
                    <div className="text-xs text-muted-foreground">Rojos</div>
                  </div>
                  <div className="text-center hidden md:block">
                    <div className="text-lg font-bold">{p.scorePromedio}</div>
                    <div className="text-xs text-muted-foreground">Score prom.</div>
                  </div>
                  <div className="text-center hidden lg:block">
                    <div className="text-lg font-bold">${(p.montoTotal / 1000).toFixed(0)}K</div>
                    <div className="text-xs text-muted-foreground">Monto total</div>
                  </div>
                  <div className="w-24 hidden md:block">
                    <div className="text-xs text-muted-foreground mb-1">Tasa riesgo: {p.tasaRiesgo}%</div>
                    <Progress
                      value={p.tasaRiesgo}
                      className={cn('h-1.5',
                        p.tasaRiesgo > 30 ? '[&>div]:bg-red-500' :
                        p.tasaRiesgo > 15 ? '[&>div]:bg-amber-500' :
                        '[&>div]:bg-emerald-500'
                      )}
                    />
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-4 bg-background/50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Casos por nivel</div>
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{p.casosRojos} Rojos</span>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{p.casosAmarillos} Amarillos</span>
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{p.casosVerdes} Verdes</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Monto total gestionado</div>
                      <div className="font-semibold">${p.montoTotal.toLocaleString()}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Score de riesgo promedio</div>
                      <div className="font-semibold">{p.scorePromedio} / 100</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Estado en lista restrictiva</div>
                      <div className={cn('font-semibold text-sm flex items-center gap-1', p.listaRestrictiva ? 'text-red-600' : 'text-emerald-600')}>
                        {p.listaRestrictiva
                          ? <><ShieldAlert className="w-4 h-4" /> En lista: {p.motivoLista}</>
                          : <><Shield className="w-4 h-4" /> Sin restricciones</>}
                      </div>
                    </div>
                  </div>

                  {p.listaRestrictiva && (
                    <div className="mt-3 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>Acción requerida:</strong> Todo siniestro con este proveedor debe pasar revisión obligatoria
                        de la Unidad Antifraude antes de continuar su trámite. No realizar pagos hasta verificación.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
