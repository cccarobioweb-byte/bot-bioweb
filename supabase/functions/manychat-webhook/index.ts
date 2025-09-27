import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Función para generar respuestas específicas de WhatsApp (ultra-cortas)
async function generateWhatsAppResponse(userMessage: string, products: any[], brandInfo: any[]): Promise<string> {
  const messageLower = userMessage.toLowerCase().trim()
  
  // Detectar saludos simples (solo si es EXACTAMENTE un saludo)
  const isSimpleGreeting = (
    messageLower === 'hola' ||
    messageLower === 'hi' ||
    messageLower === 'hello' ||
    messageLower === 'hey' ||
    messageLower === 'buenos días' ||
    messageLower === 'buenas tardes' ||
    messageLower === 'buenas noches' ||
    messageLower === 'gracias' ||
    messageLower === 'thank you' ||
    messageLower === 'adiós' ||
    messageLower === 'bye' ||
    messageLower === '?' ||
    messageLower === '¿'
  )
  
  if (isSimpleGreeting) {
    if (messageLower.includes('hola') || messageLower.includes('hi') || messageLower.includes('hello')) {
      return "*¡Hola!* Soy tu asistente de equipos técnicos. ¿Qué necesitas?"
    }
    if (messageLower.includes('gracias') || messageLower.includes('thank')) {
      return "*¡De nada!* ¿En qué más puedo ayudarte?"
    }
    if (messageLower.includes('adiós') || messageLower.includes('bye')) {
      return "*¡Hasta luego!* No dudes en consultarme cuando necesites información."
    }
    return "¿En qué puedo ayudarte con *equipos de medición*?"
  }
  
  // Si hay productos encontrados, analizar la consulta específica
  if (products.length > 0) {
    // Buscar productos que coincidan mejor con la consulta
    const queryWords = messageLower.split(' ').filter(word => word.length > 2)
    let bestMatch = products[0] // Producto por defecto
    
    // Buscar coincidencias en nombre, categoría o descripción
    for (const product of products) {
      const productText = `${product.name || ''} ${product.categoria || ''} ${product.description || ''}`.toLowerCase()
      const matches = queryWords.filter(word => productText.includes(word))
      if (matches.length > 0) {
        bestMatch = product
        break
      }
    }
    
    const productName = bestMatch.name || 'Producto'
    const category = bestMatch.categoria || 'equipo'
    
    // Respuesta específica basada en la consulta
    if (products.length === 1) {
      return `*${productName}* - ${category}. ¿Quieres saber más detalles?`
    } else {
      // Si hay múltiples productos, mencionar el más relevante
      return `*${productName}* y ${products.length - 1} opciones más. ¿Para qué aplicación específica?`
    }
  }
  
  // Sin productos encontrados - respuesta más específica
  return "No tenemos productos para esa aplicación. ¿Qué *otra cosa* necesitas?"
}

serve(async (req) => {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Obtener datos del webhook de ManyChat
    const manychatData = await req.json()
    console.log('📱 Datos recibidos de ManyChat:', manychatData)

    // Extraer información del mensaje
    const userMessage = manychatData.message || manychatData.text || ''
    const userId = manychatData.user_id || manychatData.subscriber_id || 'unknown'
    const userName = manychatData.first_name || manychatData.name || 'Usuario'
    const phoneNumber = manychatData.phone_number || ''

    if (!userMessage.trim()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No se recibió mensaje' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Usar búsqueda semántica para encontrar productos relevantes
    let products: any[] = []
    let brandInfo: any[] = []
    
    try {
      const { data: semanticResult, error: semanticError } = await supabase.functions.invoke('semantic-search', {
        body: {
          query: userMessage,
          type: 'both',
          similarity_threshold: 0.3,
          max_results: 5,
          use_cache: true
        }
      })

      if (semanticError) {
        console.error('❌ Error en búsqueda semántica:', semanticError)
      } else if (semanticResult?.success && semanticResult.results) {
        // Separar productos y marcas de los resultados semánticos
        products = semanticResult.results
          .filter((result: any) => result.type === 'product')
          .map((result: any) => result.metadata)
          .filter(Boolean)
        
        brandInfo = semanticResult.results
          .filter((result: any) => result.type === 'brand')
          .map((result: any) => result.metadata)
          .filter(Boolean)
      }
    } catch (error) {
      console.error('❌ Error en búsqueda semántica:', error)
    }

    // Usar directamente el chat normal (que ya tiene búsqueda semántica)
    const { data: chatResponse, error: chatError } = await supabase.functions.invoke('chat', {
      body: {
        message: userMessage,
        originalMessage: userMessage,
        chatHistory: [], // ManyChat no mantiene historial, empezamos limpio
        products: products || [], // Productos encontrados por búsqueda semántica
        brandInfo: brandInfo || [], // Información de marcas encontrada
        translationInfo: {
          wasTranslated: false,
          detectedLanguage: 'es'
        },
        source: 'whatsapp', // Identificar que viene de WhatsApp
        userInfo: {
          id: userId,
          name: userName,
          phone: phoneNumber
        }
      }
    })
    
    let botResponse = 'Lo siento, no pude procesar tu mensaje.'
    
    if (chatError) {
      console.error('❌ Error en chat:', chatError)
    } else {
      botResponse = chatResponse?.response || 'Lo siento, no pude procesar tu mensaje.'
      
      // Acortar respuesta para WhatsApp si es muy larga
      if (botResponse.length > 500) {
        // Buscar la primera recomendación y truncar ahí
        const firstRecommendation = botResponse.split('**RECOMENDACIÓN')[0]
        if (firstRecommendation && firstRecommendation.length > 50) {
          botResponse = firstRecommendation + '\n\n¿Quieres más detalles?'
        } else {
          botResponse = botResponse.substring(0, 400) + '...\n\n¿Quieres más detalles?'
        }
      }
    }

    // Formatear respuesta para ManyChat
    const finalResponse = botResponse || 'Lo siento, no pude procesar tu mensaje.'
    
    // ManyChat espera una respuesta específica
    const manychatResponse = {
      success: true,
      response: finalResponse,
      user_id: userId,
      timestamp: new Date().toISOString()
    }

    // Respuesta enviada a ManyChat

    return new Response(
      JSON.stringify(manychatResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error en webhook:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Error interno del servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
