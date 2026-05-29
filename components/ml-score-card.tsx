'use client'

import { useState } from 'react'
import { useAuth, useProtectedFetch } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Loader2, Zap, TrendingUp, AlertTriangle } from 'lucide-react'

interface MLScoreResponse {
  siniestroId: string
  scoreML: number
  probabilidadFraude: number
  explicacion: string
  topFactors: Array<{
    factor: string
    weight: number
    value: number
  }>
  features: {
    montoNormalizado: number
    montoEsAnomalía: boolean
    proveedorRiesgo: number
    aseguradoRiesgo: number
    reclamsRecientes: number
  }
  modelo: {
    nombre: string
    componentes: string[]
    features: number
    descripción: string
  }
}

interface MLScoreCardProps {
  siniestroId: string
  onDataLoaded?: (data: MLScoreResponse) => void
}

export function MLScoreCard({ siniestroId, onDataLoaded }: MLScoreCardProps) {
  const { token, isAuthenticated } = useAuth()
  const [data, setData] = useState<MLScoreResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const handleLoadMLScore = async () => {
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/ml-score/${siniestroId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error loading ML score')
      }

      const result = await response.json()
      setData(result.data)
      onDataLoaded?.(result.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading score'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  if (!data) {
    return (
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Machine Learning Score
          </CardTitle>
          <CardDescription>
            Análisis avanzado con regresión logística + detección de anomalías
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleLoadMLScore}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculando ML Score...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Cargar Análisis ML
              </>
            )}
          </Button>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  const riskColor =
    data.scoreML >= 76
      ? 'text-red-600 bg-red-50'
      : data.scoreML >= 41
        ? 'text-yellow-600 bg-yellow-50'
        : 'text-green-600 bg-green-50'

  const riskLabel = data.scoreML >= 76 ? 'ALTO' : data.scoreML >= 41 ? 'MEDIO' : 'BAJO'

  const chartData = data.topFactors.map(f => ({
    name: f.factor.substring(0, 15),
    fullName: f.factor,
    impacto: Math.round(Math.abs(f.weight * f.value) * 100),
  }))

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Machine Learning Score
            </CardTitle>
            <CardDescription>{data.modelo.nombre}</CardDescription>
          </div>
          <div className={`rounded-lg p-4 ${riskColor}`}>
            <div className="text-3xl font-bold">{data.scoreML}</div>
            <div className="text-sm font-semibold">{riskLabel}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score Breakdown */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-gray-600 font-semibold">Probabilidad</div>
            <div className="text-lg font-bold text-blue-600">
              {Math.round(data.probabilidadFraude * 100)}%
            </div>
          </div>

          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-gray-600 font-semibold">Features</div>
            <div className="text-lg font-bold text-purple-600">
              {data.modelo.features}
            </div>
          </div>

          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="text-gray-600 font-semibold">Monto Anomalía</div>
            <Badge variant={data.features.montoEsAnomalía ? 'destructive' : 'secondary'}>
              {data.features.montoEsAnomalía ? 'Sí' : 'No'}
            </Badge>
          </div>

          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-gray-600 font-semibold">Riesgo Proveedor</div>
            <div className="text-lg font-bold text-red-600">
              {Math.round(data.features.proveedorRiesgo * 100)}%
            </div>
          </div>
        </div>

        {/* Factores Principales */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Factores Principales
          </h4>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.[0]) {
                      return (
                        <div className="bg-white p-2 border border-gray-200 rounded shadow-lg text-xs">
                          <p className="font-semibold">{payload[0].payload.fullName}</p>
                          <p className="text-purple-600">Impacto: {payload[0].value}%</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="impacto" fill="#9333ea" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              Sin factores principales
            </p>
          )}
        </div>

        {/* Explicación */}
        <div className="border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full"
          >
            {expanded ? 'Ocultar Explicación' : 'Ver Explicación Completa'}
          </Button>

          {expanded && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200">
              <p>{data.explicacion}</p>

              <div className="mt-3 space-y-2 text-xs">
                <h5 className="font-semibold text-gray-900">Metodología:</h5>
                {data.modelo.componentes.map((comp, i) => (
                  <p key={i} className="text-gray-600">• {comp}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modelo Info */}
        <Alert className="bg-blue-50 border-blue-200">
          <Zap className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-900">
            {data.modelo.descripción}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
