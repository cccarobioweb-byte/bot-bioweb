# 🔍 Integración de Búsqueda por Imagen

## Descripción

Se ha implementado una funcionalidad que permite a los usuarios subir una foto de un producto y el sistema automáticamente:

1. **Analiza la imagen** usando OpenAI GPT-4o Vision
2. **Identifica el producto** y extrae su nombre
3. **Busca en la base de datos** si tenemos ese producto
4. **Devuelve información relevante** o sugiere alternativas

## 🚀 Flujo de Funcionamiento

```
Usuario sube foto → OpenAI GPT-4o Vision analiza → Extrae nombre del producto → 
Búsqueda semántica en BD → Respuesta al usuario
```

## 📁 Archivos Creados/Modificados

### Nuevos Archivos:
- `src/services/imageSearchService.ts` - Servicio principal de búsqueda por imagen
- `src/components/ImageUpload.tsx` - Componente de carga de imágenes
- `supabase/functions/image-analysis/index.ts` - Edge Function para análisis
- `sql/create-image-analyses-table.sql` - Tabla para almacenar análisis

### Archivos Modificados:
- `src/services/chatService.ts` - Integración del procesamiento de imágenes
- `src/components/ChatPage.tsx` - Interfaz de chat con botón de carga

## 🔧 Configuración Requerida

### Variables de Entorno en Supabase:
```bash
OPENAI_API_KEY=tu_api_key_de_openai
GOOGLE_API_KEY=tu_api_key_de_google (opcional)
GOOGLE_SEARCH_ENGINE_ID=tu_search_engine_id (opcional)
```

### Base de Datos:
Ejecutar el script SQL para crear la tabla:
```sql
-- Ver sql/create-image-analyses-table.sql
```

## 🎯 Características

### ✅ Funcionalidades Implementadas:
- **Carga de imágenes** con drag & drop
- **Validación de archivos** (JPG, PNG, WebP, máx. 10MB)
- **Análisis con DeepSeek Vision** para identificar productos
- **Búsqueda semántica** en la base de datos
- **Respuestas inteligentes** según si el producto existe o no
- **Almacenamiento de análisis** para estadísticas

### 🎨 Interfaz de Usuario:
- **Botón de carga** intuitivo con icono de cámara
- **Vista previa** de la imagen seleccionada
- **Indicador de procesamiento** con spinner
- **Mensajes informativos** sobre el estado del análisis

## 📊 Tipos de Respuesta

### 1. **Producto Encontrado en BD:**
```
He identificado este producto en la imagen: **DJI Mavic Air 2**

**Producto encontrado en nuestro catálogo:**
• **Nombre:** DJI Mavic Air 2
• **Categoría:** Drones
• **Descripción:** Drone profesional con cámara 4K

¿Te gustaría saber más detalles sobre este producto?
```

### 2. **Producto Identificado pero No Encontrado:**
```
He identificado este producto en la imagen: **Parrot Anafi**

Sin embargo, no tenemos este producto en nuestro catálogo actual. 
¿Te gustaría que te ayude a encontrar productos similares o tienes alguna consulta específica?
```

### 3. **Error en Identificación:**
```
No pude identificar claramente el producto en la imagen. 
Por favor, intenta con una imagen más clara o describe el producto que buscas.
```

## 🔍 Proceso Técnico

### 1. **Análisis de Imagen:**
- Convierte imagen a base64
- Envía a DeepSeek Vision API
- Extrae nombre y descripción del producto
- Calcula nivel de confianza

### 2. **Búsqueda en Base de Datos:**
- Usa búsqueda semántica con threshold 0.6
- Busca coincidencias exactas o similares
- Retorna producto si similitud > 0.7

### 3. **Respuesta al Usuario:**
- Genera mensaje contextual
- Incluye información del producto si existe
- Sugiere alternativas si no existe

## 📈 Estadísticas y Monitoreo

### Tabla `image_analyses`:
- Registra cada análisis realizado
- Almacena métricas de rendimiento
- Permite análisis de patrones de uso
- Facilita optimización del sistema

### Métricas Disponibles:
- Tiempo de procesamiento
- Nivel de confianza del análisis
- Productos más consultados
- Tasa de éxito en identificación

## 🚨 Consideraciones

### **Limitaciones:**
- Dependiente de la calidad de la imagen
- Requiere conexión a internet para DeepSeek
- Costos por uso de API de DeepSeek
- Limitado a productos técnicos/electrónicos

### **Optimizaciones Futuras:**
- Caché de análisis de imágenes similares
- Mejora en prompts para DeepSeek
- Integración con más APIs de búsqueda
- Análisis de sentimientos en respuestas

## 🎉 Beneficios

- **Experiencia mejorada** para usuarios
- **Identificación rápida** de productos
- **Reducción de consultas** ambiguas
- **Datos valiosos** sobre productos consultados
- **Diferenciación** de la competencia

## 🔧 Mantenimiento

### **Monitoreo Regular:**
- Revisar logs de errores en Edge Functions
- Analizar métricas de la tabla `image_analyses`
- Optimizar prompts según resultados
- Ajustar thresholds de similitud

### **Actualizaciones:**
- Mantener API keys actualizadas
- Revisar límites de uso de DeepSeek
- Optimizar rendimiento de búsquedas
- Mejorar interfaz según feedback

---

**¡La funcionalidad está lista para usar!** 🚀

Los usuarios ahora pueden subir fotos de productos y obtener información instantánea sobre si los tenemos en nuestro catálogo.
