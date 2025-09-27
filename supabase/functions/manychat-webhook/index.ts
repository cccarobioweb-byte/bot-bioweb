import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Función eliminada - ahora usamos directamente el chatbot principal

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
          reply: 'No se recibió mensaje. Por favor, envía tu consulta nuevamente.',
          status: 'error' 
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
    console.log('🤖 Llamando al chatbot principal con:', {
      message: userMessage,
      products: products.length,
      brandInfo: brandInfo.length
    })
    
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
    
    console.log('🤖 Respuesta del chatbot:', chatResponse)
    
    let botResponse = 'Lo siento, no pude procesar tu mensaje.'
    
    if (chatError) {
      console.error('❌ Error en chat:', chatError)
    } else {
      botResponse = chatResponse?.response || 'Lo siento, no pude procesar tu mensaje.'
      
      // Acortar respuesta para WhatsApp si es muy larga
      if (botResponse.length > 600) {
        // Para WhatsApp, generar respuesta más simple
        const lines = botResponse.split('\n')
        let simpleResponse = ''
        
        // Buscar la recomendación principal
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (line.includes('**RECOMENDACIÓN PRINCIPAL:**') || line.includes('**RECOMENDACIÓN:**')) {
            simpleResponse += line.replace(/\*\*/g, '*') + '\n'
            // Agregar las siguientes 2-3 líneas de justificación
            for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
              if (lines[j].trim() && !lines[j].includes('**')) {
                simpleResponse += lines[j] + '\n'
              }
            }
            break
          }
        }
        
        if (simpleResponse.trim()) {
          botResponse = simpleResponse.trim() + '\n\n¿Quieres más detalles?'
        } else {
          // Fallback: cortar en punto lógico
          const lastPeriod = botResponse.lastIndexOf('.', 400)
          if (lastPeriod > 200) {
            botResponse = botResponse.substring(0, lastPeriod + 1) + '\n\n¿Quieres más detalles?'
          } else {
            botResponse = botResponse.substring(0, 400) + '...\n\n¿Quieres más detalles?'
          }
        }
      }
    }

    // Formatear respuesta para ManyChat
    let finalResponse = botResponse || 'Lo siento, no pude procesar tu mensaje.'
    
    // Limpiar formato para WhatsApp/ManyChat
    finalResponse = finalResponse
      .replace(/\*\*/g, '*')  // Convertir ** a * para WhatsApp
      .replace(/\n\n+/g, '\n')  // Reducir saltos de línea múltiples
      .replace(/\n•/g, '\n•')  // Mantener bullets
      .trim()
    
    // ManyChat espera una respuesta específica según la documentación
    const manychatResponse = {
      reply: finalResponse,
      status: "success"
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
        reply: 'Lo siento, ocurrió un error técnico. Por favor, intenta nuevamente.',
        status: 'error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
