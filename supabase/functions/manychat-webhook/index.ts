import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Llamar a la función de chat principal
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Error procesando mensaje' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Formatear respuesta para ManyChat
    const botResponse = chatResponse?.response || 'Lo siento, no pude procesar tu mensaje.'
    
    // ManyChat espera una respuesta específica
    const manychatResponse = {
      success: true,
      response: botResponse,
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
