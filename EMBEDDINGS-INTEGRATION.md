# 🧠 Sistema de Embeddings Semánticos

Este documento explica cómo integrar y usar el sistema de embeddings semánticos con pgvector para mejorar la búsqueda del chatbot.

## 📋 Archivos Creados

### 1. **Schema de Base de Datos**
- `sql/create-embeddings-schema.sql` - Tablas y funciones para embeddings

### 2. **Edge Functions**
- `supabase/functions/generate-embeddings/index.ts` - Genera embeddings con DeepSeek
- `supabase/functions/semantic-search/index.ts` - Búsqueda semántica

### 3. **Servicio Frontend**
- `src/services/embeddingService.ts` - Cliente para usar embeddings

## 🚀 Configuración Inicial

### 1. Habilitar pgvector en Supabase

```sql
-- Ejecutar en Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Crear las Tablas

```sql
-- Ejecutar el archivo completo
\i sql/create-embeddings-schema.sql
```

### 3. Configurar Variables de Entorno

En Supabase Dashboard → Settings → Edge Functions:

```bash
DEEPSEEK_API_KEY=tu_api_key_de_deepseek
```

### 4. Desplegar Edge Functions

```bash
# Desde la terminal del proyecto
supabase functions deploy generate-embeddings
supabase functions deploy semantic-search
```

## 🔧 Uso del Sistema

### Generar Embeddings para Productos

```typescript
import { EmbeddingService } from './services/embeddingService'

// Generar embeddings para todos los productos
const result = await EmbeddingService.generateProductEmbeddings()
console.log(`✅ ${result.success} embeddings generados, ${result.failed} fallaron`)
```

### Generar Embeddings para Marcas

```typescript
// Generar embeddings para toda la información de marcas
const result = await EmbeddingService.generateBrandEmbeddings()
console.log(`✅ ${result.success} embeddings generados, ${result.failed} fallaron`)
```

### Búsqueda Semántica

```typescript
// Buscar productos similares
const searchResult = await EmbeddingService.semanticSearch({
  query: "estación meteorológica para agricultura",
  type: 'products',
  similarity_threshold: 0.7,
  max_results: 5
})

if (searchResult.success) {
  searchResult.results.forEach(result => {
    console.log(`${result.metadata.name} - Similitud: ${result.similarity}`)
  })
}
```

### Búsqueda Combinada

```typescript
// Buscar en productos y marcas
const searchResult = await EmbeddingService.semanticSearch({
  query: "equipos de medición de temperatura",
  type: 'both',
  similarity_threshold: 0.6,
  max_results: 10
})
```

## 🎯 Integración con Chat Existente

### Modificar el Chat Service

```typescript
// En src/services/chatService.ts
import { EmbeddingService } from './embeddingService'

export class ChatService {
  static async searchProducts(query: string) {
    // Primero intentar búsqueda semántica
    const semanticResult = await EmbeddingService.semanticSearch({
      query,
      type: 'both',
      similarity_threshold: 0.7,
      max_results: 10
    })

    if (semanticResult.success && semanticResult.results.length > 0) {
      // Usar resultados semánticos
      return semanticResult.results.map(r => r.metadata)
    }

    // Fallback a búsqueda tradicional
    return this.traditionalSearch(query)
  }
}
```

### Modificar ManyChat Webhook

```typescript
// En supabase/functions/manychat-webhook/index.ts
import { EmbeddingService } from '../semantic-search/index'

// Usar búsqueda semántica antes de generar respuesta
const semanticResults = await EmbeddingService.semanticSearch({
  query: userMessage,
  type: 'both',
  similarity_threshold: 0.6,
  max_results: 5
})
```

## 📊 Monitoreo y Mantenimiento

### Estadísticas de Embeddings

```typescript
const stats = await EmbeddingService.getEmbeddingStats()
console.log('Estadísticas:', stats)
```

### Limpieza Automática

```typescript
// Limpiar embeddings obsoletos
await EmbeddingService.cleanupEmbeddings()
```

### Programar Limpieza

```sql
-- Crear función programada en Supabase
SELECT cron.schedule('cleanup-embeddings', '0 2 * * *', 'SELECT cleanup_expired_semantic_cache();');
```

## 🔍 Tipos de Búsqueda

### 1. **Búsqueda por Productos**
- Busca en nombre, descripción y categoría
- Retorna productos con similitud > threshold

### 2. **Búsqueda por Marcas**
- Busca en nombre, título, contenido y JSON
- Retorna información de marcas relevante

### 3. **Búsqueda Combinada**
- Busca en productos y marcas simultáneamente
- Ordena por similitud global

### 4. **Búsqueda de Consultas**
- Almacena consultas de usuarios
- Permite análisis de patrones de búsqueda

## ⚡ Optimizaciones

### 1. **Caché Inteligente**
- Caché de 1 hora para consultas frecuentes
- Actualización automática de contadores

### 2. **Índices HNSW**
- Búsquedas vectoriales ultra-rápidas
- Configuración optimizada para PostgreSQL

### 3. **Procesamiento en Lotes**
- Generación de embeddings en lotes de 10
- Pausas entre lotes para no sobrecargar API

### 4. **Limpieza Automática**
- Eliminación de embeddings obsoletos
- Limpieza de caché expirado

## 🚨 Consideraciones Importantes

### 1. **Costos de API**
- DeepSeek cobra por tokens procesados
- Monitorear uso de la API regularmente

### 2. **Rendimiento**
- Embeddings se generan una vez y se reutilizan
- Caché reduce llamadas a la API

### 3. **Precisión**
- Ajustar `similarity_threshold` según necesidades
- Valores recomendados: 0.6-0.8

### 4. **Escalabilidad**
- pgvector maneja millones de vectores
- Índices HNSW optimizados para búsquedas rápidas

## 🔧 Solución de Problemas

### Error: "pgvector extension not found"
```sql
-- Verificar que la extensión esté habilitada
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Error: "DEEPSEEK_API_KEY not configured"
- Verificar variables de entorno en Supabase
- Asegurar que la API key sea válida

### Búsquedas lentas
- Verificar que los índices HNSW estén creados
- Ajustar parámetros de similitud

### Embeddings no se generan
- Verificar límites de la API de DeepSeek
- Revisar logs de Edge Functions

## 📈 Próximos Pasos

1. **Integración Gradual**: Implementar en paralelo al sistema actual
2. **A/B Testing**: Comparar resultados semánticos vs tradicionales
3. **Análisis de Consultas**: Usar datos de `query_embeddings` para mejoras
4. **Optimización Continua**: Ajustar thresholds basado en feedback

## 🎉 Beneficios Esperados

- **Búsquedas más precisas**: Encuentra productos por contexto, no solo palabras clave
- **Mejor experiencia de usuario**: Respuestas más relevantes
- **Escalabilidad**: Sistema preparado para miles de productos
- **Análisis avanzado**: Datos de consultas para insights de negocio
