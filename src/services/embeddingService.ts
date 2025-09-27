import { supabase } from '../lib/supabase'

export interface EmbeddingRequest {
  text: string
  type: 'product' | 'brand' | 'query'
  entity_id?: number
  content_type?: string
  user_id?: string
  source?: string
}

export interface EmbeddingResponse {
  success: boolean
  embedding?: number[]
  error?: string
  id?: number
}

export interface SemanticSearchRequest {
  query: string
  type?: 'products' | 'brands' | 'both'
  similarity_threshold?: number
  max_results?: number
  user_id?: string
  source?: string
  use_cache?: boolean
}

export interface SearchResult {
  id: number
  similarity: number
  content: string
  metadata: any
  type: 'product' | 'brand'
}

export interface SemanticSearchResponse {
  success: boolean
  results: SearchResult[]
  query_embedding?: number[]
  cached: boolean
  processing_time_ms: number
  error?: string
}

export class EmbeddingService {
  /**
   * Genera un embedding para un texto específico
   */
  static async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    try {
      if (!supabase) {
        return { success: false, error: 'Cliente Supabase no inicializado' }
      }

      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: request
      })

      if (error) {
        console.error('Error generando embedding:', error)
        return { success: false, error: error.message }
      }

      return data
    } catch (error) {
      console.error('Error en generateEmbedding:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      }
    }
  }

  /**
   * Genera embeddings en lote para múltiples textos
   */
  static async generateBatchEmbeddings(requests: EmbeddingRequest[]): Promise<EmbeddingResponse[]> {
    try {
      if (!supabase) {
        return requests.map(() => ({ success: false, error: 'Cliente Supabase no inicializado' }))
      }

      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { batch: requests }
      })

      if (error) {
        console.error('Error generando embeddings en lote:', error)
        return requests.map(() => ({ success: false, error: error.message }))
      }

      return data.results || []
    } catch (error) {
      console.error('Error en generateBatchEmbeddings:', error)
      return requests.map(() => ({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      }))
    }
  }

  /**
   * Realiza una búsqueda semántica
   */
  static async semanticSearch(request: SemanticSearchRequest): Promise<SemanticSearchResponse> {
    try {
      if (!supabase) {
        return { 
          success: false, 
          results: [], 
          cached: false, 
          processing_time_ms: 0,
          error: 'Cliente Supabase no inicializado' 
        }
      }

      const { data, error } = await supabase.functions.invoke('semantic-search', {
        body: request
      })

      if (error) {
        console.error('Error en búsqueda semántica:', error)
        return { 
          success: false, 
          results: [], 
          cached: false, 
          processing_time_ms: 0,
          error: error.message 
        }
      }

      return data
    } catch (error) {
      console.error('Error en semanticSearch:', error)
      return { 
        success: false, 
        results: [], 
        cached: false, 
        processing_time_ms: 0,
        error: error instanceof Error ? error.message : 'Error desconocido' 
      }
    }
  }

  /**
   * Genera embeddings para todos los productos activos
   */
  static async generateProductEmbeddings(): Promise<{ success: number; failed: number }> {
    try {
      // Obtener todos los productos activos
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, description, categoria')
        .eq('is_active', true)

      if (productsError) {
        throw new Error(`Error obteniendo productos: ${productsError.message}`)
      }

      if (!products || products.length === 0) {
        return { success: 0, failed: 0 }
      }

      // Preparar requests para embeddings
      const requests: EmbeddingRequest[] = products.flatMap(product => [
        {
          text: product.name,
          type: 'product' as const,
          entity_id: product.id,
          content_type: 'name'
        },
        {
          text: product.description,
          type: 'product' as const,
          entity_id: product.id,
          content_type: 'description'
        },
        {
          text: product.categoria,
          type: 'product' as const,
          entity_id: product.id,
          content_type: 'category'
        }
      ])

      // Generar embeddings en lotes de 10
      const batchSize = 10
      let success = 0
      let failed = 0

      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize)
        const results = await this.generateBatchEmbeddings(batch)
        
        results.forEach(result => {
          if (result.success) {
            success++
          } else {
            failed++
          }
        })

        // Pequeña pausa entre lotes para no sobrecargar la API
        if (i + batchSize < requests.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      return { success, failed }
    } catch (error) {
      console.error('Error generando embeddings de productos:', error)
      throw error
    }
  }

  /**
   * Genera embeddings para toda la información de marcas activa
   */
  static async generateBrandEmbeddings(): Promise<{ success: number; failed: number }> {
    try {
      // Obtener toda la información de marcas activa
      const { data: brands, error: brandsError } = await supabase
        .from('brand_info')
        .select('id, brand_name, title, content, json_data')
        .eq('is_active', true)

      if (brandsError) {
        throw new Error(`Error obteniendo marcas: ${brandsError.message}`)
      }

      if (!brands || brands.length === 0) {
        return { success: 0, failed: 0 }
      }

      // Preparar requests para embeddings
      const requests: EmbeddingRequest[] = brands.flatMap(brand => {
        const requests: EmbeddingRequest[] = [
          {
            text: brand.brand_name,
            type: 'brand' as const,
            entity_id: brand.id,
            content_type: 'brand_name'
          },
          {
            text: brand.title,
            type: 'brand' as const,
            entity_id: brand.id,
            content_type: 'title'
          }
        ]

        // Agregar contenido si existe
        if (brand.content) {
          requests.push({
            text: brand.content,
            type: 'brand' as const,
            entity_id: brand.id,
            content_type: 'content'
          })
        }

        // Agregar datos JSON si existen
        if (brand.json_data) {
          requests.push({
            text: JSON.stringify(brand.json_data),
            type: 'brand' as const,
            entity_id: brand.id,
            content_type: 'json_data'
          })
        }

        return requests
      })

      // Generar embeddings en lotes de 10
      const batchSize = 10
      let success = 0
      let failed = 0

      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize)
        const results = await this.generateBatchEmbeddings(batch)
        
        results.forEach(result => {
          if (result.success) {
            success++
          } else {
            failed++
          }
        })

        // Pequeña pausa entre lotes
        if (i + batchSize < requests.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      return { success, failed }
    } catch (error) {
      console.error('Error generando embeddings de marcas:', error)
      throw error
    }
  }

  /**
   * Limpia embeddings obsoletos
   */
  static async cleanupEmbeddings(): Promise<void> {
    try {
      // Limpiar caché expirado
      const { error: cacheError } = await supabase.rpc('cleanup_expired_semantic_cache')
      
      if (cacheError) {
        console.error('Error limpiando caché:', cacheError)
      }

      // Limpiar embeddings de productos inactivos
      const { error: productsError } = await supabase
        .from('product_embeddings')
        .delete()
        .in('product_id', 
          supabase
            .from('products')
            .select('id')
            .eq('is_active', false)
        )

      if (productsError) {
        console.error('Error limpiando embeddings de productos:', productsError)
      }

      // Limpiar embeddings de marcas inactivas
      const { error: brandsError } = await supabase
        .from('brand_embeddings')
        .delete()
        .in('brand_info_id',
          supabase
            .from('brand_info')
            .select('id')
            .eq('is_active', false)
        )

      if (brandsError) {
        console.error('Error limpiando embeddings de marcas:', brandsError)
      }

      console.log('✅ Limpieza de embeddings completada')
    } catch (error) {
      console.error('Error en cleanupEmbeddings:', error)
      throw error
    }
  }

  /**
   * Obtiene estadísticas de embeddings
   */
  static async getEmbeddingStats(): Promise<{
    products: number
    brands: number
    queries: number
    cache_entries: number
  }> {
    try {
      const [productsResult, brandsResult, queriesResult, cacheResult] = await Promise.all([
        supabase.from('product_embeddings').select('id', { count: 'exact', head: true }),
        supabase.from('brand_embeddings').select('id', { count: 'exact', head: true }),
        supabase.from('query_embeddings').select('id', { count: 'exact', head: true }),
        supabase.from('semantic_search_cache').select('id', { count: 'exact', head: true })
      ])

      return {
        products: productsResult.count || 0,
        brands: brandsResult.count || 0,
        queries: queriesResult.count || 0,
        cache_entries: cacheResult.count || 0
      }
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error)
      return {
        products: 0,
        brands: 0,
        queries: 0,
        cache_entries: 0
      }
    }
  }
}
