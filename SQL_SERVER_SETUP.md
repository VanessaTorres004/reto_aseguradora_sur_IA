# 🗄️ SQL Server Integration Guide

## 📋 Requisitos

- **SQL Server 2019+** o **SQL Server Express** (gratuito)
- **SQL Server Management Studio (SSMS)** - descargable gratis
- **Node.js driver**: `mssql` (ya incluido en dependencias)

---

## 🔧 Instalación y Configuración

### Paso 1: Instalar SQL Server (si no lo tienes)

**Opción A: SQL Server Express (Recomendado para desarrollo)**
```
1. Descargar: https://www.microsoft.com/es-es/sql-server/sql-server-downloads
2. Seleccionar "SQL Server 2022 Express" (gratuito)
3. Ejecutar installer y seguir pasos
4. Usar nombre: localhost\SQLEXPRESS
5. Autenticación: Mixed (SQL Server + Windows)
```

**Opción B: Windows Authentication (Windows 10/11)**
```
1. SQL Server ya puede estar instalado
2. Verificar en Services (Servicios) → "SQL Server (SQLEXPRESS)"
```

### Paso 2: Instalar SQL Server Management Studio (SSMS)

```
1. Descargar: https://aka.ms/ssmsfullsetup
2. Instalar (es separado de SQL Server)
3. Ejecutar y conectarse a: localhost\SQLEXPRESS
```

### Paso 3: Instalar dependencia Node.js

```bash
npm install mssql
# o si usas pnpm:
pnpm add mssql
```

### Paso 4: Ejecutar script SQL

**En SQL Server Management Studio:**

1. Abrir **New Query**
2. Copiar contenido de `db/schema.sql`
3. Ejecutar (F5)
4. Verificar que la base de datos `fraud_detection` fue creada

```sql
-- Verificar
USE fraud_detection
SELECT name FROM sys.tables
-- Debería listar: Users, Sessions, AuditLogs, MLScores, etc.
```

### Paso 5: Configurar variables de entorno

**Crear archivo `.env.local`:**

```env
# ===== SQL SERVER =====
MSSQL_SERVER=localhost\SQLEXPRESS
MSSQL_DATABASE=fraud_detection
MSSQL_USER=sa
MSSQL_PASSWORD=YourPassword123!

# O si usas Windows Authentication:
# MSSQL_SERVER=localhost\SQLEXPRESS
# MSSQL_DATABASE=fraud_detection
# MSSQL_USE_WINDOWS_AUTH=true
```

**Nota:** Reemplazar con tus credenciales reales

---

## 🚀 Primeros Pasos

### Verificar Conexión

```bash
# En la terminal del proyecto:
npm run dev

# En logs, debería aparecer:
# "✓ Conectado a SQL Server"
```

### Insertar Usuarios Demo

En SSMS, ejecutar:
```sql
USE fraud_detection

-- Verificar usuarios creados
SELECT * FROM Users

-- Debería mostrar 3 usuarios:
-- auditor@aseguradora.com (AUDITOR)
-- analista@aseguradora.com (ANALYST)
-- usuario@aseguradora.com (VIEWER)
```

---

## 📊 Tablas Principales

| Tabla | Propósito | Filas Est. |
|-------|-----------|-----------|
| **AuditLogs** | Registro de acciones | 10k-100k |
| **Users** | Usuarios autenticados | ~10 |
| **Sessions** | Sesiones activas | ~5 |
| **MLScores** | Predicciones ML | 1k-10k |
| **DocumentAnalysis** | Análisis de documentos | 100-1k |
| **RealTimeAlerts** | Alertas activas | 50-500 |
| **Exceptions** | Excepciones manuales | 10-100 |

---

## 🔐 Seguridad

### Crear Usuario de Aplicación (Opcional)

```sql
-- En SSMS como admin
USE master

CREATE LOGIN app_user WITH PASSWORD = 'SecurePassword123!'

USE fraud_detection

CREATE USER app_user FOR LOGIN app_user

-- Permisos específicos (principio de menor privilegio)
GRANT SELECT, INSERT, UPDATE ON AuditLogs TO app_user
GRANT SELECT, INSERT ON MLScores TO app_user
GRANT EXECUTE ON sp_InsertAuditLog TO app_user
GRANT EXECUTE ON sp_GetAuditLogs TO app_user
```

**Actualizar `.env.local`:**
```env
MSSQL_USER=app_user
MSSQL_PASSWORD=SecurePassword123!
```

---

## 📈 Monitoreo

### Ver logs de auditoría en tiempo real

**En SSMS:**
```sql
USE fraud_detection

-- Últimos 100 logs
EXEC sp_GetAuditLogs @Days = 1, @Limit = 100

-- Filtrar por usuario
EXEC sp_GetAuditLogs @UserId = 'user_auditor', @Limit = 50

-- Filtrar por acción de riesgo
EXEC sp_GetAuditLogs @RiskLevel = 'HIGH', @Limit = 50
```

### Ver estadísticas de ML

```sql
-- Última vista ML
SELECT TOP 10 
    SiniestroId, ScoreML, ProbabilidadFraude, CreatedAt
FROM MLScores
ORDER BY CreatedAt DESC

-- Distribución de riesgo
SELECT 
    CASE WHEN ScoreML >= 76 THEN 'ROJO' 
         WHEN ScoreML >= 41 THEN 'AMARILLO' 
         ELSE 'VERDE' END as RiskLevel,
    COUNT(*) as Count
FROM MLScores
WHERE CreatedAt > DATEADD(DAY, -7, GETUTCDATE())
GROUP BY CASE WHEN ScoreML >= 76 THEN 'ROJO' 
             WHEN ScoreML >= 41 THEN 'AMARILLO' 
             ELSE 'VERDE' END
```

### Detectar actividad sospechosa

```sql
-- Usuarios con muchas acciones fallidas
SELECT TOP 10
    UserEmail,
    COUNT(*) as TotalActions,
    SUM(CASE WHEN Status = 'FAILED' THEN 1 ELSE 0 END) as FailedActions
FROM AuditLogs
WHERE Timestamp > DATEADD(HOUR, -1, GETUTCDATE())
GROUP BY UserEmail
HAVING SUM(CASE WHEN Status = 'FAILED' THEN 1 ELSE 0 END) > 10
ORDER BY FailedActions DESC
```

---

## 📊 Backups

### Backup Manual (en SSMS)

```sql
-- Crear carpeta: C:\Backups

BACKUP DATABASE fraud_detection
TO DISK = 'C:\Backups\fraud_detection_backup.bak'
WITH INIT, COMPRESSION

-- Verificar backup
RESTORE HEADERONLY FROM DISK = 'C:\Backups\fraud_detection_backup.bak'
```

### Backup Programado (SQL Agent)

```sql
-- Crear backup automático cada día a las 2 AM
USE msdb
EXEC sp_add_schedule
    @schedule_name = 'Daily_Backup',
    @freq_type = 4,
    @freq_interval = 1,
    @active_start_time = 020000

-- (Requiere SQL Server Agent activo)
```

---

## 🐛 Troubleshooting

### "Error conectando a SQL Server"

**Soluciones:**
1. Verificar que SQL Server esté corriendo
   - Ejecutar: `services.msc` → buscar "SQL Server"
   - Debe estar en estado "Running"

2. Verificar credenciales en `.env.local`
   ```bash
   # Test connection
   sqlcmd -S localhost\SQLEXPRESS -U sa -P YourPassword
   ```

3. Verificar firewall
   - SQL Server usa puerto 1433
   - Permitir en Windows Firewall

### "Base de datos no existe"

```sql
-- Verificar bases de datos existentes
SELECT name FROM sys.databases

-- Si no está fraud_detection, re-ejecutar schema.sql completo
```

### "Error en conexión pool"

```bash
# Reiniciar la aplicación
npm run dev

# Si persiste, limpiar pool
# Editar: lib/db/mssql-config.ts
# Aumentar pool timeout
```

---

## 📱 APIs con Persistencia

Ahora todos los endpoints guardan datos:

```bash
# 1. Login (usuarios guardados en BD)
POST /api/auth/login
{
  "email": "auditor@aseguradora.com",
  "password": "demo123"
}

# 2. Acceso a casos (auditado en AuditLogs)
GET /api/siniestros?nivelRiesgo=ROJO
Authorization: Bearer <token>

# 3. ML Score (guardado en MLScores)
GET /api/ml-score/SIN-45234
Authorization: Bearer <token>

# 4. Logs de auditoría
GET /api/audit/logs
Authorization: Bearer <token> (AUDITOR solo)
```

---

## ⚙️ Mantenimiento

### Limpiar logs antiguos (90 días)

```sql
-- Ejecutar periódicamente
DELETE FROM AuditLogs
WHERE Timestamp < DATEADD(DAY, -90, GETUTCDATE())

-- O usar stored proc
EXEC sp_CleanOldLogs @Days = 90
```

### Optimizar índices

```sql
-- Reconstruir índices (1x semana)
ALTER INDEX ALL ON AuditLogs REBUILD

ALTER INDEX ALL ON MLScores REBUILD
```

### Monitorear espacio

```sql
-- Ver tamaño de BD
SELECT 
    name,
    size * 8 / 1024 as size_mb
FROM sys.master_files
WHERE database_id = DB_ID('fraud_detection')
```

---

## 📚 Recursos

- [Documentación mssql npm](https://github.com/tediousjs/node-mssql)
- [SQL Server Express Download](https://www.microsoft.com/es-es/sql-server/sql-server-downloads)
- [SSMS Keyboard Shortcuts](https://docs.microsoft.com/es-es/sql/ssms/sql-server-management-studio-keyboard-shortcuts)

---

## ✅ Checklist de Configuración

- [ ] SQL Server Express instalado
- [ ] SSMS instalado
- [ ] Schema.sql ejecutado en fraud_detection
- [ ] Usuarios demo creados
- [ ] `.env.local` configurado
- [ ] `npm install mssql` completado
- [ ] Conectar desde Node: `npm run dev`
- [ ] Verificar logs en SSMS
- [ ] Crear usuario de aplicación (opcional)
- [ ] Configurar backups

**¡Listo para usar SQL Server!** 🎉
