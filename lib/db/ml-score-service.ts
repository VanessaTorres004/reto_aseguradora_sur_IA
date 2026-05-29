/**
 * Servicio de ML Scores con SQL Server
 * Persistencia de predicciones y features
 */

import { query, executeStoredProcedure } from '@/lib/db/mssql-config'
import type { MLFeatures } from '@/lib/ml-fraud-detector'

export interface StoredMLScore {
  siniestroId: string
  scoreML: number
  probabilidadFraude: number
  explicacion: string
  features: MLFeatures
}

/**
 * Inserta un ML Score en SQL Server
 */
export async function insertMLScoreToDB(data: {
  siniestroId: string
  scoreML: number
  probabilidad: number
  explicacion: any
  features: MLFeatures
}): Promise<void> {
  try {
    await executeStoredProcedure('sp_InsertMLScore', {
      SiniestroId: data.siniestroId,
      ScoreML: data.scoreML,
      ProbabilidadFraude: data.probabilidad,
      Explicacion: JSON.stringify(data.explicacion),
      Features: JSON.stringify(data.features),
    })

    if (process.env.NODE_ENV === 'development') {
      console.log(`[ML Score] ${data.siniestroId}: ${data.scoreML}/100`)
    }
  } catch (err) {
    console.error('Error insertando ML score en BD:', err)
    throw err
  }
}

/**
 * Obtiene ML Score para un siniestro
 */
export async function getMLScoreFromDB(siniestroId: string): Promise<StoredMLScore | null> {
  try {
    const result = await query(`
      SELECT TOP 1
        SiniestroId,
        ScoreML,
        ProbabilidadFraude,
        Explicacion,
        Features,
        CreatedAt
      FROM MLScores
      WHERE SiniestroId = @SiniestroId
      ORDER BY CreatedAt DESC
    `, { SiniestroId: siniestroId })

    if (result.recordset.length === 0) return null

    const row = result.recordset[0]

    return {
      siniestroId: row.SiniestroId,
      scoreML: row.ScoreML,
      probabilidadFraude: row.ProbabilidadFraude,
      explicacion: JSON.parse(row.Explicacion || '{}'),
      features: JSON.parse(row.Features),
    }
  } catch (err) {
    console.error('Error obteniendo ML score de BD:', err)
    throw err
  }
}

/**
 * Obtiene casos de alto riesgo (usando vista)
 */
export async function getHighRiskCasesFromDB(limit: number = 20) {
  try {
    const result = await query(`
      SELECT TOP @Limit
        SiniestroId,
        ScoreML,
        ProbabilidadFraude,
        CreatedAt,
        DATEDIFF(HOUR, CreatedAt, GETUTCDATE()) as HoursOld
      FROM vw_HighRiskCases
      LIMIT @Limit
    `, { Limit: limit })

    return result.recordset
  } catch (err) {
    console.error('Error obteniendo casos de alto riesgo:', err)
    throw err
  }
}

/**
 * Obtiene estadísticas de ML scores
 */
export async function getMLScoreStatsFromDB() {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as totalScores,
        AVG(CAST(ScoreML AS FLOAT)) as averageScore,
        MIN(ScoreML) as minScore,
        MAX(ScoreML) as maxScore,
        SUM(CASE WHEN ScoreML >= 76 THEN 1 ELSE 0 END) as highRiskCount,
        SUM(CASE WHEN ScoreML >= 41 AND ScoreML < 76 THEN 1 ELSE 0 END) as mediumRiskCount,
        SUM(CASE WHEN ScoreML < 41 THEN 1 ELSE 0 END) as lowRiskCount
      FROM MLScores
      WHERE CreatedAt > DATEADD(DAY, -7, GETUTCDATE())
    `)

    return result.recordset[0]
  } catch (err) {
    console.error('Error obteniendo estadísticas de ML scores:', err)
    throw err
  }
}

/**
 * Obtiene evolución de scores a lo largo del tiempo
 */
export async function getScoreTrendFromDB(days: number = 30) {
  try {
    const result = await query(`
      SELECT 
        CAST(CreatedAt AS DATE) as Date,
        COUNT(*) as Count,
        AVG(CAST(ScoreML AS FLOAT)) as AverageScore,
        MAX(ScoreML) as MaxScore,
        MIN(ScoreML) as MinScore
      FROM MLScores
      WHERE CreatedAt > DATEADD(DAY, -@Days, GETUTCDATE())
      GROUP BY CAST(CreatedAt AS DATE)
      ORDER BY Date DESC
    `, { Days: days })

    return result.recordset
  } catch (err) {
    console.error('Error obteniendo trends de scores:', err)
    throw err
  }
}

/**
 * Actualiza un ML Score
 */
export async function updateMLScoreInDB(siniestroId: string, updates: Partial<StoredMLScore>): Promise<void> {
  try {
    let query_str = 'UPDATE MLScores SET '
    const setClauses: string[] = []
    const params: Record<string, any> = { SiniestroId: siniestroId }

    if (updates.scoreML !== undefined) {
      setClauses.push('ScoreML = @ScoreML')
      params.ScoreML = updates.scoreML
    }

    if (updates.probabilidadFraude !== undefined) {
      setClauses.push('ProbabilidadFraude = @ProbabilidadFraude')
      params.ProbabilidadFraude = updates.probabilidadFraude
    }

    if (updates.features !== undefined) {
      setClauses.push('Features = @Features')
      params.Features = JSON.stringify(updates.features)
    }

    setClauses.push('UpdatedAt = GETUTCDATE()')

    query_str += setClauses.join(', ') + ' WHERE SiniestroId = @SiniestroId'

    await query(query_str, params)
  } catch (err) {
    console.error('Error actualizando ML score en BD:', err)
    throw err
  }
}

/**
 * Obtiene distribución de scores
 */
export async function getScoreDistributionFromDB() {
  try {
    const result = await query(`
      SELECT 
        CASE 
          WHEN ScoreML >= 76 THEN 'ROJO'
          WHEN ScoreML >= 41 THEN 'AMARILLO'
          ELSE 'VERDE'
        END as RiskLevel,
        COUNT(*) as Count,
        ROUND(AVG(CAST(ScoreML AS FLOAT)), 2) as AverageScore
      FROM MLScores
      WHERE CreatedAt > DATEADD(DAY, -7, GETUTCDATE())
      GROUP BY CASE 
        WHEN ScoreML >= 76 THEN 'ROJO'
        WHEN ScoreML >= 41 THEN 'AMARILLO'
        ELSE 'VERDE'
      END
    `)

    return result.recordset
  } catch (err) {
    console.error('Error obteniendo distribución de scores:', err)
    throw err
  }
}
