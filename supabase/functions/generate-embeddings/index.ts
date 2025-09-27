import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmbeddingRequest {
  text: string
  type: 'product' | 'brand' | 'query'
  entity_id?: number
  content_type?: string
  user_id?: string
  source?: string
}

interface EmbeddingResponse {
  success: boolean
  embedding?: number[]
  error?: string
  id?: number
}

// Función para generar embeddings usando OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY no está configurada')
  }

  // Limpiar y preparar el texto
  const cleanText = text.trim().substring(0, 8000) // Limitar longitud
  
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small', // Modelo de embeddings de OpenAI
        input: cleanText,
        encoding_format: 'float'
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Error de OpenAI API: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    
    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error('Respuesta inválida de OpenAI API')
    }

    return data.data[0].embedding
  } catch (error) {
    console.error('Error generando embedding:', error)
    throw error
  }
}

// Función para guardar embedding en la base de datos
async function saveEmbedding(
  supabase: any,
  request: EmbeddingRequest,
  embedding: number[]
): Promise<number> {
  const { type, entity_id, content_type, user_id, source } = request

  try {
    if (type === 'product' && entity_id) {
      const { data, error } = await supabase
        .from('product_embeddings')
        .upsert({
          product_id: entity_id,
          content: request.text,
          embedding: embedding, // Usar array directamente
          content_type: content_type || 'product',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'product_id,content_type'
        })
        .select('id')
        .single()

      if (error) throw error
      return data.id
    }

    if (type === 'brand' && entity_id) {
      const { data, error } = await supabase
        .from('brand_embeddings')
        .upsert({
          brand_info_id: entity_id,
          content: request.text,
          embedding: embedding,
          content_type: content_type || 'brand',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'brand_info_id,content_type'
        })
        .select('id')
        .single()

      if (error) throw error
      return data.id
    }

    if (type === 'query') {
      const { data, error } = await supabase
        .from('query_embeddings')
        .upsert({
          query_text: request.text,
          embedding: embedding,
          user_id: user_id || null,
          source: source || 'api',
          created_at: new Date().toISOString()
        }, {
          onConflict: 'query_text,user_id,source'
        })
        .select('id')
        .single()

      if (error) throw error
      return data.id
    }

    throw new Error('Tipo de embedding no válido o falta entity_id')
  } catch (error) {
    console.error('Error guardando embedding:', error)
    throw error
  }
}

// Función para generar embeddings en lote
async function generateBatchEmbeddings(
  supabase: any,
  requests: EmbeddingRequest[]
): Promise<EmbeddingResponse[]> {
  const results: EmbeddingResponse[] = []

  for (const request of requests) {
    try {
      const embedding = await generateEmbedding(request.text)
      const id = await saveEmbedding(supabase, request, embedding)
      
      results.push({
        success: true,
        embedding,
        id
      })
    } catch (error) {
      results.push({
        success: false,
        error: error.message
      })
    }
  }

  return results
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

    const body = await req.json()
    const { text, type, entity_id, content_type, user_id, source, batch } = body

    // Validar entrada
    if (!text && !batch) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Se requiere texto o lote de textos' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Procesar lote de embeddings
    if (batch && Array.isArray(batch)) {
      // Procesando lote de embeddings
      
      const results = await generateBatchEmbeddings(supabase, batch)
      
      return new Response(
        JSON.stringify({
          success: true,
          results,
          processed: results.length,
          successful: results.filter(r => r.success).length
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Procesar embedding individual
    
    const embedding = await generateEmbedding(text)
    const id = await saveEmbedding(supabase, {
      text,
      type,
      entity_id,
      content_type,
      user_id,
      source
    }, embedding)

    // Embedding generado y guardado

    return new Response(
      JSON.stringify({
        success: true,
        embedding,
        id,
        dimensions: embedding.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error en generate-embeddings:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Error interno del servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
