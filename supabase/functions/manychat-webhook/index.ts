import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Función para procesar el chat de forma asíncrona y enviar respuesta real
async function processChatAsync(
  userMessage: string, 
  products: any[], 
  brandInfo: any[], 
  userId: string, 
  userName: string, 
  phoneNumber: string, 
  supabase: any
) {
  try {
    console.log('🤖 Procesando chat asíncrono para:', userId)
    
    // Llamar al chatbot principal
    const { data: chatResponse, error: chatError } = await supabase.functions.invoke('chat', {
      body: {
        message: userMessage,
        originalMessage: userMessage,
        chatHistory: [],
        products: products || [],
        brandInfo: brandInfo || [],
        translationInfo: {
          wasTranslated: false,
          detectedLanguage: 'es'
        },
        source: 'whatsapp',
        userInfo: {
          id: userId,
          name: userName,
          phone: phoneNumber
        }
      }
    })
    
    let botResponse = 'Lo siento, no pude procesar tu mensaje.'
    
    if (chatError) {
      console.error('❌ Error en chat asíncrono:', chatError)
      botResponse = 'Lo siento, ocurrió un error técnico. Por favor, intenta nuevamente.'
    } else {
      botResponse = chatResponse?.response || 'Lo siento, no pude procesar tu mensaje.'
      
      // Acortar respuesta para WhatsApp si es muy larga
      if (botResponse.length > 600) {
        const lines = botResponse.split('\n')
        let simpleResponse = ''
        
        // Buscar la recomendación principal
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (line.includes('**RECOMENDACIÓN PRINCIPAL:**') || line.includes('**RECOMENDACIÓN:**')) {
            simpleResponse += line.replace(/\*\*/g, '*') + '\n'
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
          const lastPeriod = botResponse.lastIndexOf('.', 400)
          if (lastPeriod > 200) {
            botResponse = botResponse.substring(0, lastPeriod + 1) + '\n\n¿Quieres más detalles?'
          } else {
            botResponse = botResponse.substring(0, 400) + '...\n\n¿Quieres más detalles?'
          }
        }
      }
    }

    // Formatear respuesta para WhatsApp
    let finalResponse = botResponse
      .replace(/\*\*/g, '*')
      .replace(/\n\n+/g, '\n')
      .replace(/\n•/g, '\n•')
      .trim()

    // Enviar respuesta real usando ManyChat API
    await sendManyChatMessage(userId, finalResponse)
    
  } catch (error) {
    console.error('❌ Error en procesamiento asíncrono:', error)
    await sendManyChatMessage(userId, 'Lo siento, ocurrió un error técnico. Por favor, intenta nuevamente.')
  }
}

// Función para enviar mensaje a ManyChat usando su API
async function sendManyChatMessage(userId: string, message: string) {
  try {
    const manychatApiKey = Deno.env.get('MANYCHAT_API_KEY')
    if (!manychatApiKey) {
      console.error('❌ MANYCHAT_API_KEY no configurada')
      return
    }

    // Formato correcto según documentación de ManyChat
    const response = await fetch('https://api.manychat.com/fb/sending/sendContent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${manychatApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriber_id: userId,
        data: {
          version: 'v2.0',
          content: {
            type: 'text',
            text: message
          }
        }
      })
    })

    if (response.ok) {
      console.log('✅ Mensaje enviado a ManyChat para usuario:', userId)
    } else {
      const errorText = await response.text()
      console.error('❌ Error enviando mensaje a ManyChat:', response.status, errorText)
    }
  } catch (error) {
    console.error('❌ Error en sendManyChatMessage:', error)
  }
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

    // Responder inmediatamente a ManyChat para evitar timeout
    const immediateResponse = {
      reply: "🤖 Procesando tu consulta... Te responderé en un momento.",
      status: "success"
    }

    console.log('📤 Respuesta inmediata para ManyChat:', immediateResponse)

    // Enviar respuesta inmediata
    const response = new Response(
      JSON.stringify(immediateResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

    // Procesar la consulta de forma asíncrona (sin await)
    processChatAsync(userMessage, products, brandInfo, userId, userName, phoneNumber, supabase)

    return response

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