-- ============================================================
-- FRAUD DETECTION SYSTEM - SQL SERVER SCHEMA
-- ============================================================
-- Ejecutar en SQL Server Management Studio
-- Base de datos: fraud_detection
-- ============================================================

-- 1. CREAR BASE DE DATOS (si no existe)
IF NOT EXISTS (SELECT name FROM master.dbo.sysdatabases WHERE name = N'fraud_detection')
BEGIN
    CREATE DATABASE fraud_detection
    COLLATE SQL_Latin1_General_CP1_CI_AS
END
GO

USE fraud_detection
GO

-- 2. TABLA DE USUARIOS (para autenticación)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Users')
BEGIN
    CREATE TABLE Users (
        UserId NVARCHAR(50) PRIMARY KEY,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        Name NVARCHAR(255) NOT NULL,
        Role NVARCHAR(50) NOT NULL CHECK (Role IN ('AUDITOR', 'ANALYST', 'VIEWER')),
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        LastLogin DATETIME2 NULL,
        INDEX IX_Email (Email),
        INDEX IX_Role (Role)
    )
END
GO

-- 3. TABLA DE SESIONES (tokens)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Sessions')
BEGIN
    CREATE TABLE Sessions (
        SessionToken NVARCHAR(255) PRIMARY KEY,
        UserId NVARCHAR(50) NOT NULL,
        ExpiresAt DATETIME2 NOT NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        IsActive BIT NOT NULL DEFAULT 1,
        FOREIGN KEY (UserId) REFERENCES Users(UserId),
        INDEX IX_UserId (UserId),
        INDEX IX_ExpiresAt (ExpiresAt)
    )
END
GO

-- 4. TABLA DE AUDITORÍA
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AuditLogs')
BEGIN
    CREATE TABLE AuditLogs (
        AuditId BIGINT PRIMARY KEY IDENTITY(1,1),
        LogId NVARCHAR(100) NOT NULL UNIQUE,
        Timestamp DATETIME2 DEFAULT GETUTCDATE(),
        UserId NVARCHAR(50) NOT NULL,
        UserEmail NVARCHAR(255) NOT NULL,
        Action NVARCHAR(50) NOT NULL,
        Resource NVARCHAR(500) NOT NULL,
        Details NVARCHAR(MAX) NULL, -- JSON
        Status NVARCHAR(20) NOT NULL CHECK (Status IN ('SUCCESS', 'FAILED')),
        RiskLevel NVARCHAR(20) NOT NULL CHECK (RiskLevel IN ('LOW', 'MEDIUM', 'HIGH')),
        IpAddress NVARCHAR(50) NULL,
        UserAgent NVARCHAR(500) NULL,
        INDEX IX_Timestamp (Timestamp DESC),
        INDEX IX_UserId (UserId),
        INDEX IX_Action (Action),
        INDEX IX_Status (Status),
        INDEX IX_RiskLevel (RiskLevel)
    )
END
GO

-- 5. TABLA DE ML SCORES
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MLScores')
BEGIN
    CREATE TABLE MLScores (
        ScoreId BIGINT PRIMARY KEY IDENTITY(1,1),
        SiniestroId NVARCHAR(50) NOT NULL,
        ScoreML INT NOT NULL, -- 0-100
        ProbabilidadFraude DECIMAL(5,4) NOT NULL, -- 0-1
        Explicacion NVARCHAR(MAX) NULL, -- JSON con topFactors
        Features NVARCHAR(MAX) NOT NULL, -- JSON con 16 features
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
        INDEX IX_SiniestroId (SiniestroId),
        INDEX IX_ScoreML (ScoreML),
        INDEX IX_CreatedAt (CreatedAt DESC)
    )
END
GO

-- 6. TABLA DE ANÁLISIS DE DOCUMENTOS
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DocumentAnalysis')
BEGIN
    CREATE TABLE DocumentAnalysis (
        AnalysisId BIGINT PRIMARY KEY IDENTITY(1,1),
        DocumentId NVARCHAR(100) NOT NULL UNIQUE,
        FileName NVARCHAR(500) NOT NULL,
        UploadedBy NVARCHAR(50) NOT NULL,
        DocumentType NVARCHAR(50) NOT NULL,
        Content NVARCHAR(MAX) NULL,
        ScoreFinal INT NOT NULL, -- 0-100
        NivelRiesgo NVARCHAR(20) NOT NULL CHECK (NivelRiesgo IN ('ROJO', 'AMARILLO', 'VERDE')),
        Alertas NVARCHAR(MAX) NOT NULL, -- JSON array
        Recomendaciones NVARCHAR(MAX) NOT NULL, -- JSON array
        Detalles NVARCHAR(MAX) NULL, -- JSON con campos extraídos
        UploadedAt DATETIME2 DEFAULT GETUTCDATE(),
        AnalyzedAt DATETIME2 DEFAULT GETUTCDATE(),
        INDEX IX_UploadedBy (UploadedBy),
        INDEX IX_NivelRiesgo (NivelRiesgo),
        INDEX IX_UploadedAt (UploadedAt DESC),
        FOREIGN KEY (UploadedBy) REFERENCES Users(UserId)
    )
END
GO

-- 7. TABLA DE ALERTAS EN TIEMPO REAL
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RealTimeAlerts')
BEGIN
    CREATE TABLE RealTimeAlerts (
        AlertId BIGINT PRIMARY KEY IDENTITY(1,1),
        SiniestroId NVARCHAR(50) NOT NULL,
        AlertType NVARCHAR(50) NOT NULL, -- 'HIGH_AMOUNT', 'ANOMALY', 'RESTRICTED_PROVIDER', etc
        Severity NVARCHAR(20) NOT NULL CHECK (Severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        Message NVARCHAR(1000) NOT NULL,
        Data NVARCHAR(MAX) NULL, -- JSON
        IsResolved BIT NOT NULL DEFAULT 0,
        ResolvedBy NVARCHAR(50) NULL,
        ResolvedAt DATETIME2 NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        INDEX IX_SiniestroId (SiniestroId),
        INDEX IX_AlertType (AlertType),
        INDEX IX_Severity (Severity),
        INDEX IX_IsResolved (IsResolved),
        INDEX IX_CreatedAt (CreatedAt DESC)
    )
END
GO

-- 8. TABLA DE EXCEPCIONES / WHITELIST
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Exceptions')
BEGIN
    CREATE TABLE Exceptions (
        ExceptionId BIGINT PRIMARY KEY IDENTITY(1,1),
        SiniestroId NVARCHAR(50) NOT NULL,
        Reason NVARCHAR(500) NOT NULL,
        ExceptionType NVARCHAR(50) NOT NULL, -- 'MANUAL_REVIEW', 'APPROVED', 'DENIED'
        CreatedBy NVARCHAR(50) NOT NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        ExpiresAt DATETIME2 NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        INDEX IX_SiniestroId (SiniestroId),
        INDEX IX_CreatedAt (CreatedAt DESC),
        FOREIGN KEY (CreatedBy) REFERENCES Users(UserId)
    )
END
GO

-- 9. TABLA DE CAMBIOS / AUDIT TRAIL
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ChangeLog')
BEGIN
    CREATE TABLE ChangeLog (
        ChangeId BIGINT PRIMARY KEY IDENTITY(1,1),
        TableName NVARCHAR(100) NOT NULL,
        RecordId NVARCHAR(100) NOT NULL,
        ChangeType NVARCHAR(20) NOT NULL CHECK (ChangeType IN ('INSERT', 'UPDATE', 'DELETE')),
        OldValues NVARCHAR(MAX) NULL, -- JSON
        NewValues NVARCHAR(MAX) NULL, -- JSON
        ChangedBy NVARCHAR(50) NOT NULL,
        ChangedAt DATETIME2 DEFAULT GETUTCDATE(),
        INDEX IX_TableName (TableName),
        INDEX IX_RecordId (RecordId),
        INDEX IX_ChangedAt (ChangedAt DESC)
    )
END
GO

-- 10. TABLA DE ESTADÍSTICAS (agregadas para performance)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DailyStats')
BEGIN
    CREATE TABLE DailyStats (
        StatId BIGINT PRIMARY KEY IDENTITY(1,1),
        StatDate DATE NOT NULL UNIQUE,
        TotalCases INT NOT NULL,
        HighRiskCases INT NOT NULL,
        AverageScore DECIMAL(5,2) NOT NULL,
        FalsePositives INT NOT NULL,
        ReviewedByAnalysts INT NOT NULL,
        LastUpdated DATETIME2 DEFAULT GETUTCDATE(),
        INDEX IX_StatDate (StatDate DESC)
    )
END
GO

-- ============================================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- ============================================================

CREATE NONCLUSTERED INDEX IX_AuditLogs_UserIdAction 
ON AuditLogs (UserId, Action, Timestamp DESC)
GO

CREATE NONCLUSTERED INDEX IX_MLScores_SiniestroTimestamp 
ON MLScores (SiniestroId, CreatedAt DESC)
GO

-- ============================================================
-- VISTAS (VIEWS)
-- ============================================================

-- Vista: Últimas acciones por usuario
IF OBJECT_ID('vw_UserActivity', 'V') IS NOT NULL
    DROP VIEW vw_UserActivity
GO

CREATE VIEW vw_UserActivity AS
SELECT 
    u.UserId,
    u.Email,
    u.Role,
    COUNT(*) as TotalActions,
    MAX(al.Timestamp) as LastAction,
    SUM(CASE WHEN al.Status = 'FAILED' THEN 1 ELSE 0 END) as FailedActions
FROM Users u
LEFT JOIN AuditLogs al ON u.UserId = al.UserId
WHERE al.Timestamp > DATEADD(DAY, -7, GETUTCDATE())
GROUP BY u.UserId, u.Email, u.Role
GO

-- Vista: Casos de alto riesgo
IF OBJECT_ID('vw_HighRiskCases', 'V') IS NOT NULL
    DROP VIEW vw_HighRiskCases
GO

CREATE VIEW vw_HighRiskCases AS
SELECT 
    SiniestroId,
    ScoreML,
    ProbabilidadFraude,
    CreatedAt,
    DATEDIFF(HOUR, CreatedAt, GETUTCDATE()) as HoursOld
FROM MLScores
WHERE ScoreML >= 76
ORDER BY CreatedAt DESC
GO

-- ============================================================
-- STORED PROCEDURES
-- ============================================================

-- Procedure: Insertrar log de auditoría
IF OBJECT_ID('sp_InsertAuditLog', 'P') IS NOT NULL
    DROP PROCEDURE sp_InsertAuditLog
GO

CREATE PROCEDURE sp_InsertAuditLog
    @LogId NVARCHAR(100),
    @UserId NVARCHAR(50),
    @UserEmail NVARCHAR(255),
    @Action NVARCHAR(50),
    @Resource NVARCHAR(500),
    @Details NVARCHAR(MAX),
    @Status NVARCHAR(20),
    @RiskLevel NVARCHAR(20),
    @IpAddress NVARCHAR(50) = NULL,
    @UserAgent NVARCHAR(500) = NULL
AS
BEGIN
    INSERT INTO AuditLogs (LogId, UserId, UserEmail, Action, Resource, Details, Status, RiskLevel, IpAddress, UserAgent)
    VALUES (@LogId, @UserId, @UserEmail, @Action, @Resource, @Details, @Status, @RiskLevel, @IpAddress, @UserAgent)
END
GO

-- Procedure: Obtener logs filtrados
IF OBJECT_ID('sp_GetAuditLogs', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetAuditLogs
GO

CREATE PROCEDURE sp_GetAuditLogs
    @UserId NVARCHAR(50) = NULL,
    @Action NVARCHAR(50) = NULL,
    @RiskLevel NVARCHAR(20) = NULL,
    @Days INT = 7,
    @Limit INT = 100
AS
BEGIN
    SELECT TOP (@Limit)
        AuditId, LogId, Timestamp, UserId, UserEmail, Action, 
        Resource, Status, RiskLevel
    FROM AuditLogs
    WHERE 
        (Timestamp >= DATEADD(DAY, -@Days, GETUTCDATE()))
        AND (@UserId IS NULL OR UserId = @UserId)
        AND (@Action IS NULL OR Action = @Action)
        AND (@RiskLevel IS NULL OR RiskLevel = @RiskLevel)
    ORDER BY Timestamp DESC
END
GO

-- Procedure: Insertar ML Score
IF OBJECT_ID('sp_InsertMLScore', 'P') IS NOT NULL
    DROP PROCEDURE sp_InsertMLScore
GO

CREATE PROCEDURE sp_InsertMLScore
    @SiniestroId NVARCHAR(50),
    @ScoreML INT,
    @ProbabilidadFraude DECIMAL(5,4),
    @Explicacion NVARCHAR(MAX),
    @Features NVARCHAR(MAX)
AS
BEGIN
    INSERT INTO MLScores (SiniestroId, ScoreML, ProbabilidadFraude, Explicacion, Features)
    VALUES (@SiniestroId, @ScoreML, @ProbabilidadFraude, @Explicacion, @Features)
END
GO

-- ============================================================
-- INSERTAR USUARIOS DEMO
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'auditor@aseguradora.com')
BEGIN
    INSERT INTO Users (UserId, Email, Name, Role, IsActive)
    VALUES 
        ('user_auditor', 'auditor@aseguradora.com', 'Auditor Jefe', 'AUDITOR', 1),
        ('user_analyst', 'analista@aseguradora.com', 'Analista de Fraude', 'ANALYST', 1),
        ('user_viewer', 'usuario@aseguradora.com', 'Usuario Regular', 'VIEWER', 1)
END
GO

-- ============================================================
-- PERMISSIONS & SECURITY
-- ============================================================

-- Crear usuario de aplicación (opcional)
-- IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'app_user')
-- BEGIN
--     CREATE LOGIN app_user WITH PASSWORD = 'SecurePassword123!'
--     CREATE USER app_user FOR LOGIN app_user
--     GRANT SELECT, INSERT, UPDATE ON AuditLogs TO app_user
--     GRANT SELECT, INSERT ON MLScores TO app_user
--     GRANT EXECUTE ON sp_InsertAuditLog TO app_user
-- END

PRINT '✓ Script SQL completado exitosamente'
