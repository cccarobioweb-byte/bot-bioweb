// supabase/functions/chat/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Product {
  id: number
  name: string
  description: string
  categoria: string
  type: string
  tags?: string[]
  marca?: string
  modelo?: string
  titulo?: string
  articulos_requeridos?: any[]
  articulos_opcionales?: any[]
  caracteristicas?: any[]
  especificaciones?: any
  product_data?: any
}

interface BrandInfo {
  id: number
  brand_name: string
  title: string
  content: string
  category?: string
  tags?: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ChatRequest {
  message: string
  originalMessage?: string
  chatHistory: Array<{ role: string; content: string }>
  products: Product[]
  brandInfo?: BrandInfo[]
  translationInfo?: {
    wasTranslated: boolean
    detectedLanguage: string
  }
  isTranslationRequest?: boolean
  translationPrompt?: string
}

function buildChatPrompt(
  userQuery: string, 
  products: Product[], 
  chatHistory: Array<{ role: string; content: string }>,
  brandInfo: BrandInfo[] = [],
  translationInfo?: { wasTranslated: boolean; detectedLanguage: string }
): { prompt: string; isGeneralQuery: boolean } {
  const historyText = chatHistory
    .slice(-4) // Reducido a 4 mensajes para optimizar
    .map(msg => `${msg.role === 'user' ? 'Usuario' : 'Sistema'}: ${msg.content}`)
    .join('\n')

  // Detectar tipo de consulta con análisis de contexto
  const queryLower = userQuery.toLowerCase()
  
  // Detectar consultas generales (exploración)
  const isGeneralQuery = (
    queryLower.includes('equipos') ||
    queryLower.includes('productos') ||
    queryLower.includes('catálogo') ||
    queryLower.includes('listar') ||
    queryLower.includes('mostrar') ||
    queryLower.includes('todos') ||
    queryLower.includes('tipos') ||
    queryLower.includes('opciones') ||
    queryLower.includes('disponibles') ||
    queryLower.includes('qué tienen') ||
    queryLower.includes('que tienen')
  )
  
  // Detectar consultas con contexto específico
  const hasSpecificContext = (
    queryLower.includes('para') ||
    queryLower.includes('uso') ||
    queryLower.includes('industrial') ||
    queryLower.includes('residencial') ||
    queryLower.includes('comercial') ||
    queryLower.includes('agrícola') ||
    queryLower.includes('laboratorio') ||
    queryLower.includes('granja') ||
    queryLower.includes('oficina') ||
    queryLower.includes('campo') ||
    queryLower.includes('interior') ||
    queryLower.includes('exterior')
  )

  // Detectar consultas específicas (producto concreto o análisis detallado)
  const isSpecificQuery = products.length <= 2 || (
    queryLower.includes('específico') ||
    queryLower.includes('detalle') ||
    queryLower.includes('características') ||
    queryLower.includes('especificaciones') ||
    queryLower.includes('ws-') ||
    queryLower.includes('ambient weather') ||
    queryLower.includes('modelo') ||
    queryLower.includes('marca') ||
    queryLower.includes('hobo') ||
    queryLower.includes('u30')
  )
  
  // Detectar si es consulta con contexto específico (recomendación inteligente)
  const isContextualQuery = hasSpecificContext && !isGeneralQuery && !isSpecificQuery

  // Formatear productos según el tipo de consulta usando datos JSON estructurados
  const productsText = products.length > 0 
    ? isGeneralQuery 
        ? products.slice(0, 5).map((p, index) => {
          const marca = p.marca || p.product_data?.marca || 'Sin especificar'
          const modelo = p.modelo || p.product_data?.modelo || 'Sin especificar'
          const descripcion = p.description?.substring(0, 100) + '...' || 'Sin descripción'
          return `${index + 1}. ${p.name} (${marca} ${modelo}) - ${descripcion}`
        }).join('\n')
      : products.map(p => {
          const marca = p.marca || p.product_data?.marca || 'Sin especificar'
          const modelo = p.modelo || p.product_data?.modelo || 'Sin especificar'
          const titulo = p.titulo || p.product_data?.titulo || p.name
          const caracteristicas = p.caracteristicas || p.product_data?.caracteristicas || []
          const articulos_requeridos = p.articulos_requeridos || p.product_data?.articulos_requeridos || []
          const articulos_opcionales = p.articulos_opcionales || p.product_data?.articulos_opcionales || []
          const imagenes = p.product_data?.imagenes || []
          
          return `
- Producto: ${p.name}
- Título: ${titulo}
- Marca: ${marca}
- Modelo: ${modelo}
- Categoría: ${p.categoria}
- Tipo: ${p.type}
- Tags: ${p.tags?.length ? p.tags.join(', ') : 'Ninguno'}
- Características: ${caracteristicas.slice(0, 3).join(', ')}${caracteristicas.length > 3 ? '...' : ''}
- Artículos Requeridos: ${articulos_requeridos.length > 0 ? articulos_requeridos.join(', ') : 'Ninguno'}
- Artículos Opcionales: ${articulos_opcionales.length > 0 ? articulos_opcionales.slice(0, 3).join(', ') + (articulos_opcionales.length > 3 ? '...' : '') : 'Ninguno'}
          `
        }).join('\n')
    : 'No se encontraron productos específicos en nuestro catálogo para esta consulta.'

  // Formatear información de marcas
  const brandInfoText = brandInfo.length > 0 
    ? brandInfo.map(brand => {
        let content = brand.content || ''
        
        // Si hay JSON, extraer información relevante de forma dinámica
        if (brand.json_data) {
          try {
            const json = brand.json_data
            let jsonInfo = ''
            
            // Función recursiva para extraer información de cualquier estructura JSON
            const extractJsonInfo = (obj: any, depth: number = 0): string => {
              if (depth > 3) return '' // Evitar recursión infinita
              
              let info = ''
              const indent = '   '.repeat(depth)
              
              if (Array.isArray(obj)) {
                obj.forEach((item, index) => {
                  if (typeof item === 'object' && item !== null) {
                    info += `${indent}${index + 1}. `
                    if (item.name || item.id || item.title) {
                      info += `**${item.name || item.id || item.title}**\n`
                    }
                    info += extractJsonInfo(item, depth + 1)
                  } else if (typeof item === 'string') {
                    info += `${indent}${index + 1}. ${item}\n`
                  }
                })
              } else if (typeof obj === 'object' && obj !== null) {
                Object.entries(obj).forEach(([key, value]) => {
                  if (Array.isArray(value)) {
                    if (value.length > 0) {
                      info += `${indent}**${key}:**\n`
                      info += extractJsonInfo(value, depth + 1)
                    }
                  } else if (typeof value === 'object' && value !== null) {
                    info += `${indent}**${key}:**\n`
                    info += extractJsonInfo(value, depth + 1)
                  } else if (typeof value === 'string' && value.trim()) {
                    info += `${indent}- ${key}: ${value}\n`
                  } else if (typeof value === 'number' || typeof value === 'boolean') {
                    info += `${indent}- ${key}: ${value}\n`
                  }
                })
              }
              
              return info
            }
            
            // Extraer toda la información del JSON de forma dinámica
            jsonInfo = extractJsonInfo(json)
            
            if (jsonInfo.trim()) {
              content += `\n**Información técnica detallada:**\n${jsonInfo}`
            }
            
          } catch (e) {
            console.warn('Error procesando JSON de marca:', brand.brand_name, e)
          }
        }
        
        return `
**INFORMACIÓN DE MARCA: ${brand.brand_name.toUpperCase()}**
${brand.title}

${content}

Categoría: ${brand.category || 'No especificada'}
Tags: ${brand.tags?.join(', ') || 'Ninguno'}
        `
      }).join('\n')
    : ''


  const translationNote = translationInfo?.wasTranslated 
    ? `\nNOTA: La consulta fue traducida del ${translationInfo.detectedLanguage} al español.\n`
    : ''

  // Detectar si es una solicitud de comparación
  const isComparisonRequest = userQuery.toLowerCase().includes('comparar') || 
                             userQuery.toLowerCase().includes('comparación') ||
                             userQuery.toLowerCase().includes('compare') ||
                             userQuery.toLowerCase().includes('comparison') ||
                             userQuery.toLowerCase().includes('vs') ||
                             userQuery.toLowerCase().includes('versus')

  // Detectar si es una solicitud de recomendación
  const isRecommendationRequest = userQuery.toLowerCase().includes('recomiendas') ||
                                 userQuery.toLowerCase().includes('recomendación') ||
                                 userQuery.toLowerCase().includes('cuál') ||
                                 userQuery.toLowerCase().includes('cual') ||
                                 userQuery.toLowerCase().includes('mejor') ||
                                 userQuery.toLowerCase().includes('recomend') ||
                                 userQuery.toLowerCase().includes('sugieres') ||
                                 userQuery.toLowerCase().includes('opción') ||
                                 userQuery.toLowerCase().includes('opcion')

  const comparisonInstructions = isComparisonRequest 
    ? `
COMPARACIÓN DE PRODUCTOS:
Si el usuario solicita comparar productos específicos:
1. Identifica exactamente qué productos menciona en su consulta
2. Haz una comparación estructurada y técnica de esos productos específicos
3. Usa este formato:
   **PRODUCTO A: [Nombre]**
   • Característica 1: valor
   • Característica 2: valor
   • Aplicación: uso específico
   
   **PRODUCTO B: [Nombre]**
   • Característica 1: valor
   • Característica 2: valor
   • Aplicación: uso específico
   
   **DIFERENCIAS TÉCNICAS:** [análisis objetivo de las diferencias]
4. Máximo 200 palabras para la comparación
5. Enfócate en las especificaciones técnicas y diferencias objetivas
`
    : ''

  const recommendationInstructions = isRecommendationRequest 
    ? `
RECOMENDACIÓN DE PRODUCTOS:
Si el usuario solicita una recomendación:
1. USA EL HISTORIAL DE CONVERSACIÓN para entender el contexto
2. NO repitas toda la información técnica (ya se proporcionó anteriormente)
3. Da una recomendación DIRECTA y CLARA
4. Justifica brevemente tu recomendación (máximo 3 puntos clave)
5. Usa este formato:
   **RECOMENDACIÓN: [Nombre del producto]**
   
   **JUSTIFICACIÓN:**
   • [Razón técnica 1]
   • [Razón técnica 2] 
   • [Razón técnica 3]
   
   **APLICACIÓN IDEAL:** [Para qué tipo de uso es mejor]
6. Máximo 150 palabras total
7. Sé directo y conciso
`
    : ''

  const fullPrompt = `Eres un EXPERTO EN PRODUCTOS CIENTÍFICOS Y TÉCNICOS especializado en instrumentación y equipos de medición.

PRINCIPIOS FUNDAMENTALES:
1. NUNCA inventes productos, marcas, modelos, especificaciones o precios que no estén en el catálogo
2. NUNCA menciones precios, costos, valores monetarios, euros, dólares o cualquier información económica
3. Si no hay productos que cumplan la consulta en el catálogo de productos NI en la información de marcas, di claramente "NO DISPONEMOS de productos para esta aplicación"
4. La información de marcas representa productos que SÍ están disponibles en nuestro inventario
5. Analiza el contexto de la consulta
6. Da recomendaciones SOLO de productos que están en el catálogo o en la información de marcas
7. Responde de forma completa y eficiente
8. NO incluyas información de precios en ninguna respuesta

${translationNote}

CATÁLOGO DE PRODUCTOS DISPONIBLES:
${productsText}

INFORMACIÓN TÉCNICA DE MARCAS (TAMBIÉN DISPONIBLES EN INVENTARIO):
${brandInfoText}

HISTORIAL:
${historyText}

CONSULTA: "${userQuery}"
${comparisonInstructions}
${recommendationInstructions}

IMPORTANTE: Si encuentras información en la sección "INFORMACIÓN TÉCNICA DE MARCAS", esos productos SÍ están disponibles en nuestro inventario. Usa esa información para responder al usuario con detalles técnicos completos.

FORMATOS DE RESPUESTA:

**CONSULTAS GENERALES:**
1. [Producto] - [Aplicación] - [Nivel técnico]
2. [Producto] - [Aplicación] - [Nivel técnico]
"¿Para qué aplicación específica necesitas el equipo?"

**CONSULTAS CONTEXTUALES (para uso específico):**
**ANÁLISIS TÉCNICO:**
• Aplicación: [tipo de uso identificado]
• Requisitos: [precisión, durabilidad, conectividad]
• Entorno: [condiciones de operación]

**RECOMENDACIÓN: [Producto específico]**

**JUSTIFICACIÓN:**
• [Criterio técnico 1 con datos específicos]
• [Criterio técnico 2 con datos específicos]
• [Criterio técnico 3 con datos específicos]

**APLICACIÓN IDEAL:** [Uso específico recomendado]

**CONSULTAS DE RECOMENDACIÓN:**
**RECOMENDACIÓN: [Producto]**
**JUSTIFICACIÓN:**
• [Razón técnica 1]
• [Razón técnica 2]
• [Razón técnica 3]
**APLICACIÓN IDEAL:** [Para qué es mejor]

**CONSULTAS ESPECÍFICAS:**
**PRODUCTO: [Nombre]**
**ESPECIFICACIONES:**
• [Especificación con valores]
• [Especificación con valores]
**APLICACIONES:**
• [Aplicación 1] - [Por qué es adecuado]
• [Aplicación 2] - [Por qué es adecuado]
**REQUERIMIENTOS:**
• Obligatorios: [Lista con justificación]
• Opcionales: [Lista con beneficios]

**CONSULTAS SOBRE PRODUCTOS NO DISPONIBLES:**
Si la consulta es sobre productos que NO están en el catálogo:
**RESPUESTA:**
"NO DISPONEMOS de productos para esta aplicación específica en nuestro catálogo actual."

IMPORTANTE: 
- Si NO hay productos en el catálogo para la consulta específica, responde EXACTAMENTE: "NO DISPONEMOS de productos para esta aplicación específica en nuestro catálogo actual."
- Si hay productos similares pero no exactos, indica: "No disponemos de productos que cumplan exactamente estos requisitos. Los más cercanos son: [lista con limitaciones]"
- NUNCA inventes productos, marcas, modelos o especificaciones que no estén en el catálogo
- NUNCA menciones precios, costos, valores monetarios, euros, dólares o cualquier información económica
- NO incluyas precios en comparaciones, alternativas o cualquier parte de la respuesta
- SOLO usa información de los productos que están en el catálogo proporcionado

Responde como experto técnico:`

  return { 
    prompt: fullPrompt, 
    isGeneralQuery, 
    isRecommendationRequest, 
    isContextualQuery 
  }
}

// Caché simple en memoria para la Edge Function
const edgeCache = new Map<string, { response: string; timestamp: number }>()
const CACHE_TTL = 2 * 60 * 1000 // 2 minutos

async function callDeepSeek(prompt: string, isGeneralQuery: boolean = false, isRecommendationRequest: boolean = false, isContextualQuery: boolean = false): Promise<string> {
  // Verificar caché
  const cacheKey = prompt.substring(0, 100) // Usar primeros 100 caracteres como clave
  const cached = edgeCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('🎯 Edge Function cache hit')
    return cached.response
  }

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
  
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY no encontrada')
  }

  // Límites optimizados para respuestas completas y eficientes
  const maxTokens = isGeneralQuery ? 200 : 
                   (isRecommendationRequest ? 300 : 
                   (isContextualQuery ? 500 : 800))  // Consultas contextuales: análisis técnico completo
  const temperature = isGeneralQuery ? 0.1 : 0.2

  console.log('🚀 Iniciando llamada a DeepSeek con streaming...')
  const startTime = Date.now()

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: temperature,
      stream: true,
      top_p: 0.8,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('DeepSeek API error:', errorText)
    throw new Error(`Error de DeepSeek API: ${response.status}`)
  }

  // Procesar streaming response
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No se pudo obtener el reader del stream')
  }

  let fullResponse = ''
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          
          if (data === '[DONE]') {
            console.log('✅ Streaming completado')
            break
          }

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            
            if (content) {
              fullResponse += content
            }
          } catch (e) {
            // Ignorar errores de parsing de líneas vacías
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  const endTime = Date.now()
  console.log(`⏱️ DeepSeek streaming completado en ${endTime - startTime}ms`)

  if (!fullResponse) {
    throw new Error('Respuesta vacía de DeepSeek API')
  }

  // Guardar en caché
  edgeCache.set(cacheKey, { response: fullResponse, timestamp: Date.now() })
  
  // Limpiar caché si tiene más de 50 entradas
  if (edgeCache.size > 50) {
    const now = Date.now()
    for (const [key, value] of edgeCache.entries()) {
      if (now - value.timestamp >= CACHE_TTL) {
        edgeCache.delete(key)
      }
    }
  }

  return fullResponse
}

async function callDeepSeekWithMessages(messages: Array<{role: string; content: string}>): Promise<string> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
  
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY no encontrada')
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      max_tokens: 2000,
      temperature: 0.1
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('DeepSeek API error:', errorText)
    throw new Error(`Error de DeepSeek API: ${response.status}`)
  }

  const data = await response.json()
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Respuesta inválida de DeepSeek API')
  }

  return data.choices[0].message.content
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      message, 
      originalMessage,
      chatHistory = [], 
      products = [],
      brandInfo = [],
      translationInfo,
      isTranslationRequest = false,
      translationPrompt
    }: ChatRequest = await req.json()

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Mensaje requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let response: string

    if (isTranslationRequest && translationPrompt) {
      // Solicitud de traducción directa
      const translationMessages = [
        {
          role: 'system',
          content: translationPrompt
        },
        {
          role: 'user',
          content: message
        }
      ]
      
      response = await callDeepSeek(translationPrompt + '\n\n' + message, false, false, false)
    } else {
      // Construir el prompt para DeepSeek (chat normal)
      const { prompt, isGeneralQuery, isRecommendationRequest, isContextualQuery } = buildChatPrompt(message, products, chatHistory, brandInfo, translationInfo)
      response = await callDeepSeek(prompt, isGeneralQuery, isRecommendationRequest, isContextualQuery)
    }
    
    // La comparación ahora se maneja directamente en el prompt de DeepSeek
    // No necesitamos lógica adicional para tablas

    return new Response(
      JSON.stringify({ 
        response: response.trim()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in chat function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        response: 'Lo siento, ocurrió un error técnico. Por favor intenta nuevamente o contacta al administrador del sistema.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})