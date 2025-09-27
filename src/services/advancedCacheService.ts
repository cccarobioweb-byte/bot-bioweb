// src/services/advancedCacheService.ts
import { supabase } from '../lib/supabase'

export interface SearchResultWithCache {
  products: any[]
  total: number
  hasMore: boolean
  searchTime: number
  fromCache: boolean
  cacheHit: boolean
}

export class AdvancedCacheService {
  private static readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutos en frontend
  private static frontendCache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  /**
   * Búsqueda con caché inteligente (base de datos + frontend)
   */
  static async searchWithCache(
    query: string,
    options: {
      type?: string
      collection?: string
      limit?: number
      offset?: number
      useCache?: boolean
    } = {}
  ): Promise<SearchResultWithCache> {
    const startTime = Date.now()
    const cacheKey = this.generateCacheKey(query, options)
    
    // 1. Verificar caché frontend primero
    const frontendCached = this.getFrontendCache(cacheKey)
    if (frontendCached) {
      return {
        ...frontendCached,
        searchTime: Date.now() - startTime,
        cacheHit: true
      }
    }

    try {
      // 2. Usar función de búsqueda con caché de base de datos
      const { data, error } = await supabase.rpc('search_products_with_cache', {
        search_query: query,
        product_type: options.type || null,
        collection_filter: options.collection || null,
        limit_count: options.limit || 50,
        offset_count: options.offset || 0,
        use_cache: options.useCache !== false
      })

      if (error) {
        console.error('Error in cached search:', error)
        throw error
      }

      const result = {
        products: data || [],
        total: data?.length || 0,
        hasMore: (options.offset || 0) + (options.limit || 50) < (data?.length || 0),
        searchTime: Date.now() - startTime,
        fromCache: data?.[0]?.from_cache || false,
        cacheHit: false
      }

      // 3. Guardar en caché frontend
      this.setFrontendCache(cacheKey, result, this.getCacheTTL(query))

      return result
    } catch (error) {
      console.error('Error in advanced cache search:', error)
      throw error
    }
  }

  /**
   * Generar clave de caché
   */
  private static generateCacheKey(query: string, options: any): string {
    return JSON.stringify({
      query: query.toLowerCase().trim(),
      type: options.type || '',
      collection: options.collection || '',
      limit: options.limit || 50,
      offset: options.offset || 0
    })
  }

  /**
   * Obtener TTL basado en el tipo de búsqueda
   */
  private static getCacheTTL(query: string): number {
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('estación') || lowerQuery.includes('meteorológica')) {
      return 10 * 60 * 1000 // 10 minutos para búsquedas populares
    }
    
    if (lowerQuery.includes('temperatura') || lowerQuery.includes('humedad')) {
      return 7 * 60 * 1000 // 7 minutos para búsquedas comunes
    }
    
    return this.CACHE_TTL // 5 minutos por defecto
  }

  /**
   * Caché frontend
   */
  private static getFrontendCache(key: string): any | null {
    const cached = this.frontendCache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data
    }
    return null
  }

  private static setFrontendCache(key: string, data: any, ttl: number): void {
    this.frontendCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Limpiar todo el caché
   */
  static clearAllCache(): void {
    this.frontendCache.clear()
  }
}





