import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Función para generar respuestas específicas de WhatsApp (ultra-cortas)
async function generateWhatsAppResponse(userMessage: string, products: any[], brandInfo: any[]): Promise<string> {
  const messageLower = userMessage.toLowerCase().trim()
  
  // Detectar saludos simples
  const isGreeting = (
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
  
  if (isGreeting) {
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
  
  // Detectar consultas de productos específicos
  if (products.length > 0) {
    const product = products[0]
    const productName = product.name || 'Producto'
    const category = product.categoria || 'equipo'
    
    // Respuesta ultra-corta para WhatsApp
    if (products.length === 1) {
      return `*${productName}* - ${category}. ¿Quieres saber más detalles?`
    } else {
      return `Tenemos *${products.length} opciones*. ¿Para qué aplicación específica?`
    }
  }
  
  // Sin productos encontrados
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

    // Buscar productos relevantes antes de llamar al chat
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .limit(20)

    if (productsError) {
      console.error('❌ Error buscando productos:', productsError)
    }

    // Buscar información de marcas relevantes
    const { data: brandInfo, error: brandError } = await supabase
      .from('brand_info')
      .select('*')
      .eq('is_active', true)
      .limit(10)

    if (brandError) {
      console.error('❌ Error buscando información de marcas:', brandError)
    }

    // Crear prompt específico para WhatsApp (respuestas cortas)
    const whatsappResponse = await generateWhatsAppResponse(userMessage, products || [], brandInfo || [])
    
    // Si no se puede generar respuesta específica, usar chat normal
    let botResponse = whatsappResponse
    
    if (!whatsappResponse || whatsappResponse.length < 10) {
      console.log('🔄 Usando chat normal para WhatsApp')
      const { data: chatResponse, error: chatError } = await supabase.functions.invoke('chat', {
        body: {
          message: userMessage,
          originalMessage: userMessage,
          chatHistory: [], // ManyChat no mantiene historial, empezamos limpio
          products: products || [], // Productos encontrados
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
      
      if (chatError) {
        console.error('❌ Error en chat:', chatError)
        botResponse = 'Lo siento, no pude procesar tu mensaje.'
      } else {
        botResponse = chatResponse?.response || 'Lo siento, no pude procesar tu mensaje.'
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

    console.log('✅ Respuesta enviada a ManyChat:', manychatResponse)

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
