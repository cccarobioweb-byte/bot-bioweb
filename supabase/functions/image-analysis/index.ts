import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Función para validar la solicitud de imagen
function validateImageRequest(imageBase64: string, imageType: string): string | null {
  // Validar tipo de imagen
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(imageType)) {
    return 'Tipo de imagen no soportado. Use JPG, PNG o WebP.'
  }

  // Validar tamaño del base64 (aproximadamente 1.33x el tamaño del archivo original)
  const maxBase64Size = 7 * 1024 * 1024 // ~5MB en base64
  if (imageBase64.length > maxBase64Size) {
    return 'La imagen es demasiado grande. Máximo 5MB.'
  }

  // Validar que el base64 sea válido
  try {
    // Intentar decodificar una pequeña parte para verificar formato
    const testChunk = imageBase64.substring(0, 100)
    atob(testChunk)
  } catch (error) {
    return 'Formato de imagen inválido.'
  }

  // Validar que no sea un archivo vacío
  if (imageBase64.length < 100) {
    return 'La imagen es demasiado pequeña.'
  }

  return null
}

interface ImageAnalysisRequest {
  imageBase64: string
  imageType: string
  user_id?: string
  source?: string
}

interface ImageAnalysisResponse {
  success: boolean
  productName?: string
  productDescription?: string
  confidence?: number
  error?: string
  processing_time_ms: number
}

// Función para analizar imagen con OpenAI Vision
async function analyzeImageWithOpenAI(imageBase64: string, imageType: string): Promise<{
  success: boolean
  productName?: string
  productDescription?: string
  confidence?: number
  error?: string
}> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  if (!openaiApiKey) {
    return {
      success: false,
      error: 'OPENAI_API_KEY no está configurada'
    }
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Usar GPT-4o que tiene excelente visión
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analiza esta imagen y extrae información del producto que aparece. 
                
                Instrucciones específicas:
                1. Identifica el nombre exacto del producto (marca y modelo si es visible)
                2. Si es un drone, busca marcas como DJI, Parrot, Autel, etc.
                3. Si es equipo técnico, identifica la marca y modelo específico
                4. Busca texto visible en la imagen (nombres, modelos, códigos)
                5. Si ves múltiples productos, enfócate en el principal
                6. Responde SOLO con un JSON en este formato:
                {
                  "productName": "nombre exacto del producto",
                  "productDescription": "descripción breve del producto",
                  "confidence": 0.95
                }
                
                Ejemplos de nombres correctos:
                - "DJI Mavic Air 2"
                - "Parrot Anafi"
                - "Autel EVO II"
                - "DJI Phantom 4 Pro"
                - "DJI Mini 3 Pro"
                - "DJI Air 2S"
                
                Si no puedes identificar claramente el producto, responde con confidence menor a 0.7.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageType};base64,${imageBase64}`,
                  detail: 'high' // Usar alta resolución para mejor reconocimiento
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Error de OpenAI API: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return {
        success: false,
        error: 'No se recibió respuesta de la API'
      }
    }

    console.log('🔍 Respuesta de OpenAI:', content)

    // Intentar parsear el JSON de la respuesta
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        
        // Validar que tenemos los campos necesarios
        if (result.productName && result.confidence >= 0.7) {
          return {
            success: true,
            productName: result.productName.trim(),
            productDescription: result.productDescription?.trim(),
            confidence: result.confidence
          }
        }
      }
    } catch (parseError) {
      console.warn('Error parseando JSON de OpenAI:', parseError)
    }

    // Fallback: extraer información de texto libre
    const productNameMatch = content.match(/(?:producto|product|modelo|model|drone|equipo)[\s\S]*?([A-Za-z0-9\s\-_]+)/i)
    if (productNameMatch) {
      return {
        success: true,
        productName: productNameMatch[1].trim(),
        productDescription: content.substring(0, 200),
        confidence: 0.6
      }
    }

    return {
      success: false,
      error: 'No se pudo identificar un producto en la imagen'
    }

  } catch (error) {
    console.error('Error analizando imagen con OpenAI:', error)
    return {
      success: false,
      error: error.message || 'Error al analizar la imagen'
    }
  }
}

// Función para buscar en web con Google Custom Search (opcional)
async function searchProductInWeb(productName: string): Promise<{
  success: boolean
  webResults?: any[]
  error?: string
}> {
  const googleApiKey = Deno.env.get('GOOGLE_API_KEY')
  const googleSearchEngineId = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')
  
  if (!googleApiKey || !googleSearchEngineId) {
    return {
      success: false,
      error: 'Google API no configurada'
    }
  }

  try {
    const searchQuery = `${productName} drone equipo técnico`
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleSearchEngineId}&q=${encodeURIComponent(searchQuery)}&num=3`
    )

    if (!response.ok) {
      throw new Error(`Error de Google API: ${response.status}`)
    }

    const data = await response.json()
    return {
      success: true,
      webResults: data.items || []
    }
  } catch (error) {
    console.error('Error buscando en web:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

serve(async (req) => {
  const startTime = Date.now()

  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const {
      imageBase64,
      imageType,
      user_id,
      source = 'api'
    }: ImageAnalysisRequest = await req.json()

    if (!imageBase64 || !imageType) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Se requiere imagen en base64 y tipo de imagen',
          processing_time_ms: Date.now() - startTime
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validaciones del lado del servidor
    const validationError = validateImageRequest(imageBase64, imageType)
    if (validationError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: validationError,
          processing_time_ms: Date.now() - startTime
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔍 Iniciando análisis de imagen con OpenAI...')

    // 1. Analizar imagen con OpenAI Vision
    const analysisResult = await analyzeImageWithOpenAI(imageBase64, imageType)
    
    if (!analysisResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: analysisResult.error,
          processing_time_ms: Date.now() - startTime
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`✅ Producto identificado: ${analysisResult.productName}`)

    // 2. Opcional: Buscar en web para verificar
    let webResults = null
    if (analysisResult.productName) {
      const webSearch = await searchProductInWeb(analysisResult.productName)
      if (webSearch.success) {
        webResults = webSearch.webResults
        console.log(`🌐 Encontrados ${webResults?.length || 0} resultados en web`)
      }
    }

    // 3. Guardar análisis en base de datos para estadísticas
    try {
      await supabase
        .from('image_analyses')
        .insert({
          user_id: user_id || null,
          source: source,
          product_name: analysisResult.productName,
          product_description: analysisResult.productDescription,
          confidence: analysisResult.confidence,
          web_results_count: webResults?.length || 0,
          processing_time_ms: Date.now() - startTime
        })
    } catch (dbError) {
      console.warn('Error guardando análisis en BD:', dbError)
      // No es crítico, continuar
    }

    const response: ImageAnalysisResponse = {
      success: true,
      productName: analysisResult.productName,
      productDescription: analysisResult.productDescription,
      confidence: analysisResult.confidence,
      processing_time_ms: Date.now() - startTime
    }

    console.log(`🎯 Análisis completado en ${response.processing_time_ms}ms`)

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error('❌ Error en image-analysis:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Error interno del servidor',
        processing_time_ms: processingTime
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
