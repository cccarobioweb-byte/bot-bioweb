import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Función para procesar el chat de forma asíncrona y enviar respuesta real
async function processChatAsync(userMessage, products, brandInfo, userId, userName, phoneNumber, supabase) {
  try {
    console.log('🤖 Procesando chat asíncrono para:', userId);

    // Llamar al chatbot principal
    const { data: chatResponse, error: chatError } = await supabase.functions.invoke('chat', {
      body: {
        message: userMessage,
        originalMessage: userMessage,
        chatHistory: [],
        products: products || [],
        brandInfo: brandInfo || [],
        translationInfo: { wasTranslated: false, detectedLanguage: 'es' },
        source: 'whatsapp',
        userInfo: { id: userId, name: userName, phone: phoneNumber }
      }
    });

    let botResponse = chatError
      ? 'Lo siento, ocurrió un error técnico. Por favor, intenta nuevamente.'
      : chatResponse?.response || 'Lo siento, no pude procesar tu mensaje.';

    // Acortar respuesta si es muy larga
    if (botResponse.length > 600) {
      const lines = botResponse.split('\n');
      let simpleResponse = '';
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('**RECOMENDACIÓN PRINCIPAL:**') || line.includes('**RECOMENDACIÓN:**')) {
          simpleResponse += line.replace(/\*\*/g, '*') + '\n';
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            if (lines[j].trim() && !lines[j].includes('**')) simpleResponse += lines[j] + '\n';
          }
          break;
        }
      }
      if (simpleResponse.trim()) {
        botResponse = simpleResponse.trim() + '\n\n¿Quieres más detalles?';
      } else {
        const lastPeriod = botResponse.lastIndexOf('.', 400);
        botResponse = lastPeriod > 200
          ? botResponse.substring(0, lastPeriod + 1) + '\n\n¿Quieres más detalles?'
          : botResponse.substring(0, 400) + '...\n\n¿Quieres más detalles?';
      }
    }

    const finalResponse = botResponse.replace(/\*\*/g, '*').replace(/\n\n+/g, '\n').trim();

    // Enviar respuesta real usando ManyChat API
    await sendManyChatMessage(userId, finalResponse);
  } catch (error) {
    console.error('❌ Error en procesamiento asíncrono:', error);
    await sendManyChatMessage(userId, 'Lo siento, ocurrió un error técnico. Por favor, intenta nuevamente.');
  }
}

// Función para enviar mensaje a ManyChat usando su API
async function sendManyChatMessage(userId, message) {
  try {
    const manychatApiKey = Deno.env.get('MANYCHAT_API_KEY');
    if (!manychatApiKey) return console.error('❌ MANYCHAT_API_KEY no configurada');

    const response = await fetch('https://api.manychat.com/fb/sending/sendContent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${manychatApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriber_id: userId,
        data: {
          version: '1.0',
          content: {
            messages: [{ type: 'text', text: message }]
          }
        }
      })
    });

    if (response.ok) console.log('✅ Mensaje enviado a ManyChat para usuario:', userId);
    else console.error('❌ Error enviando mensaje a ManyChat:', response.status, await response.text());
  } catch (error) {
    console.error('❌ Error en sendManyChatMessage:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const manychatData = await req.json();
    console.log('📱 Datos recibidos de ManyChat:', manychatData);

    const userMessage = manychatData.message || manychatData.text || '';
    const userId = manychatData.user_id || manychatData.subscriber_id || 'unknown';
    const userName = manychatData.first_name || manychatData.name || 'Usuario';
    const phoneNumber = manychatData.phone_number || '';

    if (!userMessage.trim()) {
      return new Response(JSON.stringify({
        version: "1.0",
        content: { messages: [{ type: "text", text: "No se recibió mensaje. Por favor, envía tu consulta nuevamente." }] }
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Búsqueda semántica
    let products = [], brandInfo = [];
    try {
      const { data: semanticResult, error: semanticError } = await supabase.functions.invoke('semantic-search', {
        body: { query: userMessage, type: 'both', similarity_threshold: 0.3, max_results: 5, use_cache: true }
      });

      if (semanticError) console.error('❌ Error en búsqueda semántica:', semanticError);
      else if (semanticResult?.success && semanticResult.results) {
        products = semanticResult.results.filter(r => r.type === 'product').map(r => r.metadata).filter(Boolean);
        brandInfo = semanticResult.results.filter(r => r.type === 'brand').map(r => r.metadata).filter(Boolean);
      }
    } catch (error) { console.error('❌ Error en búsqueda semántica:', error); }

    // Respuesta inmediata al webhook
    const immediateResponse = {
      version: "1.0",
      content: { messages: [{ type: "text", text: "🤖 Procesando tu consulta... Te responderé en un momento." }] }
    };
    console.log('📤 Respuesta inmediata para ManyChat:', immediateResponse);

    // Respuesta inmediata
    const response = new Response(JSON.stringify(immediateResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    // Procesamiento asíncrono
    processChatAsync(userMessage, products, brandInfo, userId, userName, phoneNumber, supabase);

    return response;

  } catch (error) {
    console.error('❌ Error en webhook:', error);
    return new Response(JSON.stringify({
      version: "1.0",
      content: { messages: [{ type: "text", text: "Lo siento, ocurrió un error técnico. Por favor, intenta nuevamente." }] }
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});