import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, chatHistory = [] } = await req.json();

    if (!message?.trim()) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Mensaje requerido'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Usar la API key interna de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Configuración de Supabase no encontrada'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Búsqueda semántica
    let products = [], brandInfo = [];
    try {
      const { data: semanticResult, error: semanticError } = await supabase.functions.invoke('semantic-search', {
        body: {
          query: message,
          type: 'both',
          similarity_threshold: 0.3,
          max_results: 5,
          use_cache: true
        }
      });

      if (semanticError) {
        console.error('❌ Error en búsqueda semántica:', semanticError);
      } else if (semanticResult?.success && semanticResult.results) {
        products = semanticResult.results
          .filter(r => r.type === 'product')
          .map(r => r.metadata)
          .filter(Boolean);
        brandInfo = semanticResult.results
          .filter(r => r.type === 'brand')
          .map(r => r.metadata)
          .filter(Boolean);
      }
    } catch (error) {
      console.error('❌ Error en búsqueda semántica:', error);
    }

    // Llamar al chatbot principal
    const { data: chatResponse, error: chatError } = await supabase.functions.invoke('chat', {
      body: {
        message,
        originalMessage: message,
        chatHistory,
        products: products || [],
        brandInfo: brandInfo || [],
        translationInfo: { wasTranslated: false, detectedLanguage: 'es' },
        source: 'shopify',
        userInfo: { id: 'shopify-user', name: 'Cliente Shopify' }
      }
    });

    if (chatError) {
      console.error('❌ Error en chat:', chatError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Error al procesar el mensaje'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      response: chatResponse?.response || 'Lo siento, no pude procesar tu mensaje.',
      translationInfo: chatResponse?.translationInfo
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error en shopify-chat:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
  }
});
