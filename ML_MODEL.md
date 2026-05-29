# 🤖 Machine Learning - Fraud Detection

## Resumen del Modelo

El sistema implementa un **modelo de ML tipo Ensemble** que combina:

1. **Regresión Logística (70%)** - Probabilidad basada en features
2. **Detección de Anomalías (30%)** - Isolation Forest simulado

**Resultado:** Score 0-100 + Explicabilidad de factores

---

## 🧮 Features del Modelo (16 características)

### 📊 Características de Monto
- **montoNormalizado** - Monto en escala 0-1
- **montoEsAnomalía** - ¿Es un outlier? (IQR method)
- **montoZScore** - Desviación estándar del monto

### 🏢 Características de Proveedor
- **proveedorRiesgoHistórico** - Score 0-1 del proveedor
- **proveedorEnListaRestrictiva** - Boolean
- **proveedorFrecuencia** - Número de casos del proveedor

### 👤 Características de Asegurado
- **aseguradoReclamosAnteriores** - Cantidad histórica
- **aseguradoTasaFraude** - Tasa de fraude histórica (0-1)

### ⏰ Características Temporales
- **diasDesdeÚltimoReclamo** - Días desde último reclamo
- **reclamsEnÚltimos30Días** - Count de reclamos recientes
- **esFechaRara** - ¿Fin de mes, viernes 13, etc?

### 📋 Características de Documentación
- **documentosCompletos** - Boolean
- **similitudNarrativa** - Similitud con otros casos (0-1)

### 🎯 Características de Contexto
- **ramoRiesgo** - Riesgo intrínseco del ramo (0-1)
- **montoVsSumaAsegurada** - Ratio monto/póliza
- **diasReporteDemora** - Días de delay en reporte

---

## 📐 Algoritmo: Regresión Logística

### Función Sigmoide
```
P(fraude) = 1 / (1 + e^-z)

Donde:
z = w0*x0 + w1*x1 + ... + w16*x16 + bias
```

### Pesos Calibrados (Ejemplo)
```
montoEsAnomalía:          0.35  (factor MÁS importante)
proveedorRiesgoHistórico: 0.18
aseguradoTasaFraude:      0.25
proveedorEnListaRestrictiva: 0.22
reclamsEnÚltimos30Días:   0.20
...
documentosCompletos:     -0.15  (negativo = reduce riesgo)
diasDesdeÚltimoReclamo:  -0.08  (negativo = reduce riesgo)
```

**Resultado:** Probabilidad de fraude (0-1) × 100 = Score (0-100)

---

## 🔍 Anomaly Detection (30%)

Cuenta indicadores anómalos:
- ✓ Monto es outlier
- ✓ Z-score > 2.5
- ✓ Proveedor con riesgo > 80%
- ✓ Reclamos > 5
- ✓ Reclamos en últimos 30 días > 2
- ✓ Monto > 120% de suma asegurada
- etc.

**Score anómalo** = (indicadores detectados / 10)

---

## 📈 Ensemble Final

```
Score Final = (LogisticScore × 0.7) + (AnomalyScore × 0.3)
```

Ventajas:
- Logística captura patrones globales
- Anomalía detecta outliers extremos
- Más robusto que cualquiera por separado

---

## 💡 Interpretabilidad

### Ejemplo 1: Score ROJO (80/100)
```
Siniestro: SIN-45234
Factores principales:
  1. Monto es Anomalía (80%+) → +0.35
  2. Asegurado tasa fraude: 35% → +0.25
  3. Reclamos últimos 30 días: 3 → +0.20

Explicación:
"Monto excesivamente alto, combinado con historial del asegurado
y reclamos frecuentes recientes. Requiere revisión especializada."
```

### Ejemplo 2: Score VERDE (25/100)
```
Siniestro: SIN-89012
Factores positivos:
  1. Documentos completos → -0.15
  2. Muchos días desde último reclamo → -0.08
  3. Proveedor de bajo riesgo → -0.18

Explicación:
"Documentación completa, sin actividad sospechosa reciente,
proveedor de confianza. Proceder con flujo normal."
```

---

## 🎯 Rendimiento Esperado

Con datos históricos bien calibrados:
- **Precisión**: ~85-90% (falsos positivos bajos)
- **Recall**: ~80-85% (detecta 80-85% de fraudes)
- **ROC-AUC**: ~0.88-0.92

---

## 🔄 Cómo se Entrena en Producción

1. **Datos históricos**: Casos etiquetados (Fraude/Legítimo)
2. **Feature extraction**: Calcular 16 features para cada caso
3. **Split**: 70% entrenamiento, 30% validación
4. **Optimización**: Ajustar pesos con gradient descent
5. **Validación**: Matriz de confusión, ROC curve
6. **Deployment**: Guardar modelo y weights
7. **Monitoring**: Drift detection, reentrenamiento mensual

---

## 📊 API Endpoint

```bash
GET /api/ml-score/:siniestroId
Authorization: Bearer <token>

Response:
{
  "siniestroId": "SIN-45234",
  "scoreML": 78,
  "probabilidadFraude": 0.78,
  "explicacion": "...",
  "topFactors": [
    {"factor": "Monto es Anomalía", "weight": 0.35, "value": 1},
    {"factor": "Tasa Fraude Asegurado", "weight": 0.25, "value": 0.35},
    ...
  ],
  "modelo": {
    "nombre": "Ensemble ML",
    "componentes": ["Regresión Logística (70%)", "Anomalía Detection (30%)"],
    "features": 16
  }
}
```

---

## 🚀 Mejoras Futuras

1. **Deep Learning**: LSTM para patrones temporales
2. **NLP avanzado**: Transformer para narrativas
3. **Ensemble múltiple**: XGBoost + Neural Net
4. **Feature Store**: Actualización en tiempo real
5. **A/B Testing**: Comparar versiones de modelos
6. **Explainability avanzada**: SHAP, LIME
7. **Feedback loop**: Aprender de decisiones humanas

---

## ⚖️ Consideraciones Éticas

✅ **Transparencia**: Explicabilidad por defecto
✅ **No discriminación**: Monitorear sesgos por género/edad
✅ **Interpretabilidad**: Factores comprensibles para humanos
✅ **Auditabilidad**: Logs de todas las decisiones
✅ **Validación humana**: Siempre requiere revisión
✅ **Accountability**: Responsabilidad clara

❌ **NO**: Decisiones automáticas sin validación
❌ **NO**: Black box sin explicabilidad
❌ **NO**: Usarlo fuera del contexto de seguros

---

## 📚 Referencias

- Logistic Regression: https://en.wikipedia.org/wiki/Logistic_regression
- Anomaly Detection: https://en.wikipedia.org/wiki/Anomaly_detection
- Feature Engineering: https://en.wikipedia.org/wiki/Feature_engineering
- Insurance Fraud: https://www.iii.org/fact-statistic/facts-statistics-insurance-fraud
