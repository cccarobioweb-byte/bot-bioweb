// src/services/optimizedSearchService.ts
import { supabase, type Product } from '../lib/supabase'
import { AdvancedCacheService } from './advancedCacheService'

export interface SearchOptions {
  query?: string
  type?: 'equipo' | 'accesorio' | 'suministro'
  collection?: string
  limit?: number
  offset?: number
  useFuzzySearch?: boolean
  similarityThreshold?: number
}

export interface SearchResult {
  products: Product[]
  total: number
  hasMore: boolean
  searchTime: number
  cacheHit?: boolean
}

export class OptimizedSearchService {
  private static searchCache = new Map<string, { result: SearchResult; timestamp: number }>()
  private static readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutos

  /**
   * Búsqueda optimizada con múltiples estrategias
   */
  static async searchProducts(options: SearchOptions = {}): Promise<SearchResult> {
    const startTime = Date.now()
    
    try {
      // Estrategia 1: Búsqueda full-text con función optimizada
      if (options.query && options.query.trim().length > 0) {
        try {
          const result = await this.fullTextSearch(options)
          return {
            ...result,
            searchTime: Date.now() - startTime
          }
        } catch (error) {
          console.warn('Full-text search failed, trying fuzzy search:', error)
        }
      }
      
      // Estrategia 2: Búsqueda por similitud (fuzzy search)
      if (options.query && options.query.trim().length > 0) {
        try {
          const result = await this.fuzzySearch(options)
          return {
            ...result,
            searchTime: Date.now() - startTime
          }
        } catch (error) {
          console.warn('Fuzzy search failed, trying simple search:', error)
        }
      }
      
      // Estrategia 3: Búsqueda simple (fallback)
      const result = await this.simpleSearch(options)
      return {
        ...result,
        searchTime: Date.now() - startTime
      }
      
    } catch (error) {
      console.error('All search strategies failed:', error)
      throw error
    }
  }

  /**
   * Búsqueda full-text usando la función optimizada de PostgreSQL
   */
  private static async fullTextSearch(options: SearchOptions): Promise<SearchResult> {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    try {
      // Usar la función optimizada de PostgreSQL
      const { data, error } = await supabase.rpc('search_products_optimized', {
        search_query: options.query || '',
        product_type: options.type || null,
        collection_filter: options.collection || null,
        limit_count: options.limit || 50,
        offset_count: options.offset || 0
      })

      if (error) {
        console.error('Error in optimized function:', error)
        throw error
      }

      // Obtener el total de resultados usando la misma lógica
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .or(`name_lower.ilike.%${options.query}%,collection_lower.ilike.%${options.query}%,description_lower.ilike.%${options.query}%`)

      return {
        products: data || [],
        total: count || 0,
        hasMore: (options.offset || 0) + (options.limit || 50) < (count || 0),
        searchTime: 0 // Se calculará en el método principal
      }
    } catch (error) {
      console.error('Error in full-text search:', error)
      throw error
    }
  }

  /**
   * Búsqueda por similitud (fuzzy search)
   */
  private static async fuzzySearch(options: SearchOptions): Promise<SearchResult> {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase.rpc('search_products_similarity', {
      search_query: options.query || '',
      similarity_threshold: options.similarityThreshold || 0.3,
      limit_count: options.limit || 20
    })

    if (error) {
      console.error('Error in fuzzy search:', error)
      throw error
    }

    return {
      products: data || [],
      total: data?.length || 0,
      hasMore: false, // Fuzzy search no soporta paginación fácil
      searchTime: 0
    }
  }

  /**
   * Búsqueda simple con filtros
   */
  private static async simpleSearch(options: SearchOptions): Promise<SearchResult> {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    try {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      // Aplicar filtros
      if (options.type) {
        query = query.eq('type', options.type)
      }

      if (options.collection) {
        query = query.ilike('collection', `%${options.collection}%`)
      }

      // Aplicar búsqueda de texto si existe
      if (options.query) {
        query = query.or(`name.ilike.%${options.query}%,collection.ilike.%${options.query}%,description.ilike.%${options.query}%`)
      }

      // Aplicar paginación
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      } else if (options.limit) {
        query = query.limit(options.limit)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error in simple search:', error)
        throw error
      }

      return {
        products: data || [],
        total: count || 0,
        hasMore: (options.offset || 0) + (options.limit || 50) < (count || 0),
        searchTime: 0
      }
    } catch (error) {
      console.error('Error in simple search:', error)
      // Fallback a búsqueda básica sin filtros
      const { data, error: fallbackError } = await supabase
        .from('products')
        .select('*')
        .limit(options.limit || 50)

      if (fallbackError) {
        throw fallbackError
      }

      return {
        products: data || [],
        total: data?.length || 0,
        hasMore: false,
        searchTime: 0
      }
    }
  }

  /**
   * Búsqueda multi-fase para máxima precisión
   */
  static async multiPhaseSearch(query: string, limit: number = 20): Promise<Product[]> {
    const phases = [
      // Fase 1: Búsqueda exacta en nombre
      { query: query, type: 'exact', field: 'name' },
      // Fase 2: Búsqueda full-text
      { query: query, type: 'fulltext' },
      // Fase 3: Búsqueda por similitud
      { query: query, type: 'fuzzy', threshold: 0.4 },
      // Fase 4: Búsqueda parcial
      { query: query, type: 'partial' }
    ]

    const results = new Map<number, Product>()
    let remainingLimit = limit

    for (const phase of phases) {
      if (remainingLimit <= 0) break

      try {
        let phaseResults: Product[] = []

        switch (phase.type) {
          case 'exact':
            phaseResults = await this.exactSearch(phase.query, phase.field as keyof Product)
            break
          case 'fulltext':
            const fullTextResult = await this.fullTextSearch({ query: phase.query, limit: remainingLimit })
            phaseResults = fullTextResult.products
            break
          case 'fuzzy':
            const fuzzyResult = await this.fuzzySearch({ 
              query: phase.query, 
              limit: remainingLimit,
              similarityThreshold: phase.threshold 
            })
            phaseResults = fuzzyResult.products
            break
          case 'partial':
            phaseResults = await this.partialSearch(phase.query, remainingLimit)
            break
        }

        // Agregar resultados únicos
        for (const product of phaseResults) {
          if (!results.has(product.id) && remainingLimit > 0) {
            results.set(product.id, product)
            remainingLimit--
          }
        }
      } catch (error) {
        console.warn(`Error in search phase ${phase.type}:`, error)
        // Continuar con la siguiente fase
      }
    }

    return Array.from(results.values())
  }

  /**
   * Búsqueda exacta en un campo específico
   */
  private static async exactSearch(query: string, field: keyof Product): Promise<Product[]> {
    if (!supabase) return []

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .ilike(field as string, `%${query}%`)
      .limit(10)

    if (error) {
      console.error('Error in exact search:', error)
      return []
    }

    return data || []
  }

  /**
   * Búsqueda parcial en múltiples campos
   */
  private static async partialSearch(query: string, limit: number): Promise<Product[]> {
    if (!supabase) return []

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .or(`name_lower.ilike.%${query}%,collection_lower.ilike.%${query}%,description_lower.ilike.%${query}%`)
      .limit(limit)

    if (error) {
      console.error('Error in partial search:', error)
      return []
    }

    return data || []
  }

  /**
   * Generar clave de caché
   */
  private static generateCacheKey(options: SearchOptions): string {
    return JSON.stringify({
      query: options.query || '',
      type: options.type || '',
      collection: options.collection || '',
      limit: options.limit || 50,
      offset: options.offset || 0,
      useFuzzySearch: options.useFuzzySearch || false,
      similarityThreshold: options.similarityThreshold || 0.3
    })
  }

  /**
   * Limpiar caché
   */
  static clearCache(): void {
    this.searchCache.clear()
  }

  /**
   * Obtener estadísticas del caché
   */
  static getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.searchCache.size,
      hitRate: 0 // Se puede implementar tracking de hits/misses
    }
  }

  /**
   * Búsqueda de productos para el chatbot (optimizada)
   */
  static async findRelevantProductsForChat(query: string, limit: number = 10): Promise<Product[]> {
    try {
      // Usar búsqueda multi-fase para máxima precisión
      const products = await this.multiPhaseSearch(query, limit)
      
      // Traducir productos si es necesario
      const translatedProducts = await this.translateProductsIfNeeded(products)
      
      return translatedProducts
    } catch (error) {
      console.error('Error finding relevant products for chat:', error)
      return []
    }
  }

  /**
   * Traducir productos si están en inglés
   */
  private static async translateProductsIfNeeded(products: Product[]): Promise<Product[]> {
    // Implementar lógica de traducción si es necesario
    // Por ahora retornar los productos tal como están
    return products
  }
}
