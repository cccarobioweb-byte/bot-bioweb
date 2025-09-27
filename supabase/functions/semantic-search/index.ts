import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SemanticSearchRequest {
  query: string
  type?: 'products' | 'brands' | 'both'
  similarity_threshold?: number
  max_results?: number
  user_id?: string
  source?: string
  use_cache?: boolean
}

interface SearchResult {
  id: number
  similarity: number
  content: string
  metadata: any
  type: 'product' | 'brand'
}

interface SemanticSearchResponse {
  success: boolean
  results: SearchResult[]
  query_embedding?: number[]
  cached: boolean
  processing_time_ms: number
  error?: string
}

// Función para generar embedding de consulta
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY no está configurada')
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query.trim(),
        encoding_format: 'float'
      })
    })

    if (!response.ok) {
      throw new Error(`Error de OpenAI API: ${response.status}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  } catch (error) {
    console.error('Error generando embedding de consulta:', error)
    throw error
  }
}

// Función para verificar caché
async function checkCache(
  supabase: any,
  queryHash: string
): Promise<{ cached: boolean; results?: SearchResult[] }> {
  try {
    const { data, error } = await supabase
      .from('semantic_search_cache')
      .select('results, result_count')
      .eq('query_hash', queryHash)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) {
      return { cached: false }
    }

    // Actualizar contador de acceso
    await supabase
      .from('semantic_search_cache')
      .update({
        access_count: data.access_count + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('query_hash', queryHash)

    return { 
      cached: true, 
      results: data.results || [] 
    }
  } catch (error) {
    console.error('Error verificando caché:', error)
    return { cached: false }
  }
}

// Función para guardar en caché
async function saveToCache(
  supabase: any,
  queryHash: string,
  query: string,
  queryEmbedding: number[],
  results: SearchResult[]
): Promise<void> {
  try {
    await supabase
      .from('semantic_search_cache')
      .upsert({
        query_hash: queryHash,
        query_text: query,
        query_embedding: queryEmbedding,
        results: results,
        result_count: results.length,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hora
      }, {
        onConflict: 'query_hash'
      })
  } catch (error) {
    console.error('Error guardando en caché:', error)
    // No lanzar error, el caché es opcional
  }
}

// Función para búsqueda semántica en productos
async function searchProducts(
  supabase: any,
  queryEmbedding: number[],
  threshold: number,
  maxResults: number
): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase.rpc('find_similar_products', {
      query_embedding: queryEmbedding,
      similarity_threshold: threshold,
      max_results: maxResults
    })

    if (error) {
      console.error('Error en búsqueda de productos:', error)
      return []
    }

    // Obtener información completa de los productos
    const productIds = data.map((item: any) => item.product_id)
    if (productIds.length === 0) return []

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('is_active', true)

    if (productsError) {
      console.error('Error obteniendo productos:', productsError)
      return []
    }

    // Combinar resultados de similitud con datos del producto
    return data.map((similarityResult: any) => {
      const product = products.find((p: any) => p.id === similarityResult.product_id)
      return {
        id: similarityResult.product_id,
        similarity: similarityResult.similarity,
        content: similarityResult.content,
        metadata: product,
        type: 'product' as const
      }
    })
  } catch (error) {
    console.error('Error en searchProducts:', error)
    return []
  }
}

// Función para búsqueda semántica en marcas
async function searchBrands(
  supabase: any,
  queryEmbedding: number[],
  threshold: number,
  maxResults: number
): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase.rpc('find_similar_brands', {
      query_embedding: queryEmbedding,
      similarity_threshold: threshold,
      max_results: maxResults
    })

    if (error) {
      console.error('Error en búsqueda de marcas:', error)
      return []
    }

    // Obtener información completa de las marcas
    const brandIds = data.map((item: any) => item.brand_info_id)
    if (brandIds.length === 0) return []

    const { data: brands, error: brandsError } = await supabase
      .from('brand_info')
      .select('*')
      .in('id', brandIds)
      .eq('is_active', true)

    if (brandsError) {
      console.error('Error obteniendo marcas:', brandsError)
      return []
    }

    // Combinar resultados de similitud con datos de la marca
    return data.map((similarityResult: any) => {
      const brand = brands.find((b: any) => b.id === similarityResult.brand_info_id)
      return {
        id: similarityResult.brand_info_id,
        similarity: similarityResult.similarity,
        content: similarityResult.content,
        metadata: brand,
        type: 'brand' as const
      }
    })
  } catch (error) {
    console.error('Error en searchBrands:', error)
    return []
  }
}

// Función para generar hash de consulta
function generateQueryHash(query: string, type: string, threshold: number): string {
  const crypto = new TextEncoder()
  const data = crypto.encode(`${query}-${type}-${threshold}`)
  return Array.from(new Uint8Array(data))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 64)
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
      query,
      type = 'both',
      similarity_threshold = 0.7,
      max_results = 10,
      user_id,
      source = 'api',
      use_cache = true
    }: SemanticSearchRequest = await req.json()

    if (!query || !query.trim()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Se requiere una consulta de búsqueda' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Búsqueda semántica iniciada

    // Verificar caché si está habilitado
    const queryHash = generateQueryHash(query, type, similarity_threshold)
    let cachedResults: SearchResult[] = []
    let fromCache = false

    if (use_cache) {
      const cacheResult = await checkCache(supabase, queryHash)
      if (cacheResult.cached && cacheResult.results) {
        cachedResults = cacheResult.results
        fromCache = true
        console.log(`📦 Resultados obtenidos del caché`)
      }
    }

    let results: SearchResult[] = cachedResults
    let queryEmbedding: number[] = []

    // Si no hay caché, realizar búsqueda
    if (!fromCache) {
      // Generar embedding de la consulta
      queryEmbedding = await generateQueryEmbedding(query)
      console.log(`🧠 Embedding generado (${queryEmbedding.length} dimensiones)`)

      // Realizar búsquedas según el tipo
      const searchPromises: Promise<SearchResult[]>[] = []

      if (type === 'products' || type === 'both') {
        searchPromises.push(
          searchProducts(supabase, queryEmbedding, similarity_threshold, max_results)
        )
      }

      if (type === 'brands' || type === 'both') {
        searchPromises.push(
          searchBrands(supabase, queryEmbedding, similarity_threshold, max_results)
        )
      }

      const searchResults = await Promise.all(searchPromises)
      results = searchResults.flat()

      // Ordenar por similitud
      results.sort((a, b) => b.similarity - a.similarity)

      // Limitar resultados
      results = results.slice(0, max_results)

      // Guardar en caché
      if (use_cache && results.length > 0) {
        await saveToCache(supabase, queryHash, query, queryEmbedding, results)
        console.log(`💾 Resultados guardados en caché`)
      }

      // Guardar consulta del usuario para análisis
      try {
        await supabase
          .from('query_embeddings')
          .upsert({
            query_text: query,
            embedding: `[${queryEmbedding.join(',')}]`,
            user_id: user_id || null,
            source: source,
            results_count: results.length
          }, {
            onConflict: 'query_text,user_id,source'
          })
      } catch (error) {
        console.error('Error guardando consulta:', error)
        // No es crítico, continuar
      }
    }

    const processingTime = Date.now() - startTime

    // Búsqueda completada

    return new Response(
      JSON.stringify({
        success: true,
        results,
        query_embedding: fromCache ? undefined : queryEmbedding,
        cached: fromCache,
        processing_time_ms: processingTime
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error('❌ Error en semantic-search:', error)
    
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
