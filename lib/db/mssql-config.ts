/**
 * Configuración de conexión a SQL Server
 * Variables de entorno requeridas:
 * - MSSQL_SERVER: servidor (ej: localhost\SQLEXPRESS)
 * - MSSQL_DATABASE: base de datos
 * - MSSQL_USER: usuario
 * - MSSQL_PASSWORD: contraseña
 */

import sql from 'mssql'

const config: sql.config = {
  server: process.env.MSSQL_SERVER || 'localhost\\SQLEXPRESS',
  database: process.env.MSSQL_DATABASE || 'fraud_detection',
  authentication: {
    type: 'default',
    options: {
      userName: process.env.MSSQL_USER || 'sa',
      password: process.env.MSSQL_PASSWORD || 'YourPassword123!',
    },
  },
  options: {
    trustServerCertificate: true,
    encrypt: false, // Para desarrollo local
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

let pool: sql.ConnectionPool | null = null

/**
 * Obtiene o crea pool de conexiones
 */
export async function getConnection(): Promise<sql.ConnectionPool> {
  if (pool) {
    return pool
  }

  try {
    pool = new sql.ConnectionPool(config)
    await pool.connect()
    console.log('✓ Conectado a SQL Server')
    return pool
  } catch (err) {
    console.error('✗ Error conectando a SQL Server:', err)
    throw err
  }
}

/**
 * Cierra la conexión
 */
export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.close()
    pool = null
    console.log('✓ Conexión cerrada')
  }
}

/**
 * Ejecuta una query
 */
export async function query(queryString: string, params?: Record<string, any>) {
  const conn = await getConnection()
  const request = conn.request()

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value)
    }
  }

  return request.query(queryString)
}

/**
 * Ejecuta un stored procedure
 */
export async function executeStoredProcedure(
  procName: string,
  params?: Record<string, any>
) {
  const conn = await getConnection()
  const request = conn.request()

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value)
    }
  }

  return request.execute(procName)
}
