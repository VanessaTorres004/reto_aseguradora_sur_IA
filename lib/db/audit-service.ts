/**
 * Servicio de Auditoría con SQL Server
 * Persistencia de logs en base de datos
 */

import { query, executeStoredProcedure } from '@/lib/db/mssql-config'
import type { AuditAction, AuditLog } from '@/lib/security/audit-log'

/**
 * Inserta un log de auditoría en SQL Server
 */
export async function insertAuditLogToDB(
  auditLog: Omit<AuditLog, 'id' | 'timestamp'> & { id: string; timestamp: Date }
): Promise<void> {
  try {
    await executeStoredProcedure('sp_InsertAuditLog', {
      LogId: auditLog.id,
      UserId: auditLog.userId,
      UserEmail: auditLog.userEmail,
      Action: auditLog.action,
      Resource: auditLog.resource,
      Details: JSON.stringify(auditLog.details),
      Status: auditLog.status,
      RiskLevel: auditLog.riskLevel,
      IpAddress: auditLog.ipAddress || null,
      UserAgent: auditLog.userAgent || null,
    })

    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUDIT DB] ${auditLog.action} por ${auditLog.userEmail}`)
    }
  } catch (err) {
    console.error('Error insertando audit log en BD:', err)
    throw err
  }
}

/**
 * Obtiene logs de auditoría desde SQL Server
 */
export async function getAuditLogsFromDB(filter?: {
  userId?: string
  action?: AuditAction
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH'
  days?: number
  limit?: number
}): Promise<AuditLog[]> {
  try {
    const result = await executeStoredProcedure('sp_GetAuditLogs', {
      UserId: filter?.userId || null,
      Action: filter?.action || null,
      RiskLevel: filter?.riskLevel || null,
      Days: filter?.days || 7,
      Limit: filter?.limit || 100,
    })

    return result.recordset.map((row: any) => ({
      id: row.LogId,
      timestamp: row.Timestamp,
      userId: row.UserId,
      userEmail: row.UserEmail,
      action: row.Action,
      resource: row.Resource,
      status: row.Status,
      riskLevel: row.RiskLevel,
      details: {}, // Los detalles estarían en JSON en BD
    }))
  } catch (err) {
    console.error('Error obteniendo audit logs de BD:', err)
    throw err
  }
}

/**
 * Obtiene estadísticas de auditoría
 */
export async function getAuditStatsFromDB() {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as totalLogs,
        COUNT(DISTINCT UserId) as uniqueUsers,
        SUM(CASE WHEN Status = 'FAILED' THEN 1 ELSE 0 END) as failedActions,
        SUM(CASE WHEN RiskLevel = 'HIGH' THEN 1 ELSE 0 END) as highRiskActions,
        MAX(Timestamp) as lastAction
      FROM AuditLogs
      WHERE Timestamp > DATEADD(DAY, -7, GETUTCDATE())
    `)

    return result.recordset[0]
  } catch (err) {
    console.error('Error obteniendo estadísticas de auditoría:', err)
    throw err
  }
}

/**
 * Exporta logs de auditoría a CSV
 */
export async function exportAuditLogsToCSV(days: number = 7): Promise<string> {
  try {
    const result = await query(`
      SELECT 
        Timestamp,
        UserEmail,
        Action,
        Resource,
        Status,
        RiskLevel
      FROM AuditLogs
      WHERE Timestamp > DATEADD(DAY, -@Days, GETUTCDATE())
      ORDER BY Timestamp DESC
    `, { Days: days })

    const rows = result.recordset

    const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Status', 'Risk Level']
    const csvRows = rows.map((row: any) =>
      [
        row.Timestamp.toISOString(),
        row.UserEmail,
        row.Action,
        row.Resource,
        row.Status,
        row.RiskLevel,
      ].map(cell => `"${cell}"`).join(',')
    )

    const csv = [
      headers.join(','),
      ...csvRows,
    ].join('\n')

    return csv
  } catch (err) {
    console.error('Error exportando logs a CSV:', err)
    throw err
  }
}

/**
 * Limpia logs antiguos (política de retención)
 */
export async function cleanOldAuditLogs(days: number = 90): Promise<number> {
  try {
    const result = await query(`
      DELETE FROM AuditLogs
      WHERE Timestamp < DATEADD(DAY, -@Days, GETUTCDATE())
    `, { Days: days })

    return result.rowsAffected[0]
  } catch (err) {
    console.error('Error limpiando logs antiguos:', err)
    throw err
  }
}

/**
 * Obtiene actividad de un usuario
 */
export async function getUserActivity(userId: string, days: number = 7) {
  try {
    const result = await query(`
      SELECT 
        Action,
        COUNT(*) as Count,
        SUM(CASE WHEN Status = 'FAILED' THEN 1 ELSE 0 END) as Failed,
        MAX(Timestamp) as LastTime
      FROM AuditLogs
      WHERE UserId = @UserId
        AND Timestamp > DATEADD(DAY, -@Days, GETUTCDATE())
      GROUP BY Action
      ORDER BY Count DESC
    `, { UserId: userId, Days: days })

    return result.recordset
  } catch (err) {
    console.error('Error obteniendo actividad de usuario:', err)
    throw err
  }
}

/**
 * Detecta actividades sospechosas (pattern matching)
 */
export async function detectSuspiciousActivity() {
  try {
    const result = await query(`
      SELECT TOP 10
        UserId,
        UserEmail,
        COUNT(*) as ActionCount,
        SUM(CASE WHEN Status = 'FAILED' THEN 1 ELSE 0 END) as FailedCount
      FROM AuditLogs
      WHERE Timestamp > DATEADD(HOUR, -1, GETUTCDATE())
      GROUP BY UserId, UserEmail
      HAVING COUNT(*) > 50 OR SUM(CASE WHEN Status = 'FAILED' THEN 1 ELSE 0 END) > 20
      ORDER BY ActionCount DESC
    `)

    return result.recordset
  } catch (err) {
    console.error('Error detectando actividad sospechosa:', err)
    throw err
  }
}
