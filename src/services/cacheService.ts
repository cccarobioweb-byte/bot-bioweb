/**
 * Servicio de caché para optimizar consultas frecuentes
 */

interface CacheEntry {
  data: any
  timestamp: number
  ttl: number // Time to live en milisegundos
}

interface SearchCacheEntry extends CacheEntry {
  data: {
    products: any[]
    query: string
    keywords: string[]
  }
}

class CacheService {
  private static instance: CacheService
  private searchCache = new Map<string, SearchCacheEntry>()
  private translationCache = new Map<string, CacheEntry>()
  private chatCache = new Map<string, CacheEntry>()
  
  // TTL por defecto (en milisegundos)
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutos
  private readonly SEARCH_TTL = 10 * 60 * 1000 // 10 minutos para búsquedas
  private readonly TRANSLATION_TTL = 30 * 60 * 1000 // 30 minutos para traducciones
  private readonly CHAT_TTL = 2 * 60 * 1000 // 2 minutos para respuestas de chat

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  /**
   * Genera clave de caché para búsquedas
   */
  private generateSearchKey(query: string, keywords: string[]): string {
    const normalizedQuery = query.toLowerCase().trim()
    const sortedKeywords = keywords.sort().join(',')
    return `search:${normalizedQuery}:${sortedKeywords}`
  }

  /**
   * Genera clave de caché para traducciones
   */
  private generateTranslationKey(text: string): string {
    return `translation:${text.toLowerCase().trim()}`
  }

  /**
   * Genera clave de caché para respuestas de chat
   */
  private generateChatKey(message: string, context: string): string {
    return `chat:${message.toLowerCase().trim()}:${context}`
  }

  /**
   * Verifica si una entrada de caché es válida
   */
  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl
  }

  /**
   * Obtiene datos de caché de búsqueda
   */
  getSearchCache(query: string, keywords: string[]): any[] | null {
    const key = this.generateSearchKey(query, keywords)
    const entry = this.searchCache.get(key)
    
    if (entry && this.isValid(entry)) {
      console.log('🎯 Cache hit para búsqueda:', key)
      return entry.data.products
    }
    
    if (entry) {
      this.searchCache.delete(key)
    }
    
    return null
  }

  /**
   * Guarda datos de caché de búsqueda
   */
  setSearchCache(query: string, keywords: string[], products: any[]): void {
    const key = this.generateSearchKey(query, keywords)
    this.searchCache.set(key, {
      data: { products, query, keywords },
      timestamp: Date.now(),
      ttl: this.SEARCH_TTL
    })
    
    // Limpiar caché si tiene más de 100 entradas
    if (this.searchCache.size > 100) {
      this.cleanupCache(this.searchCache)
    }
  }

  /**
   * Obtiene traducción del caché
   */
  getTranslationCache(text: string): string | null {
    const key = this.generateTranslationKey(text)
    const entry = this.translationCache.get(key)
    
    if (entry && this.isValid(entry)) {
      console.log('🌍 Cache hit para traducción:', key.substring(0, 50) + '...')
      return entry.data
    }
    
    if (entry) {
      this.translationCache.delete(key)
    }
    
    return null
  }

  /**
   * Guarda traducción en caché
   */
  setTranslationCache(text: string, translation: string): void {
    const key = this.generateTranslationKey(text)
    this.translationCache.set(key, {
      data: translation,
      timestamp: Date.now(),
      ttl: this.TRANSLATION_TTL
    })
    
    // Limpiar caché si tiene más de 200 entradas
    if (this.translationCache.size > 200) {
      this.cleanupCache(this.translationCache)
    }
  }

  /**
   * Obtiene respuesta de chat del caché
   */
  getChatCache(message: string, context: string): string | null {
    const key = this.generateChatKey(message, context)
    const entry = this.chatCache.get(key)
    
    if (entry && this.isValid(entry)) {
      console.log('💬 Cache hit para chat:', key.substring(0, 50) + '...')
      return entry.data
    }
    
    if (entry) {
      this.chatCache.delete(key)
    }
    
    return null
  }

  /**
   * Guarda respuesta de chat en caché
   */
  setChatCache(message: string, context: string, response: string): void {
    const key = this.generateChatKey(message, context)
    this.chatCache.set(key, {
      data: response,
      timestamp: Date.now(),
      ttl: this.CHAT_TTL
    })
    
    // Limpiar caché si tiene más de 50 entradas
    if (this.chatCache.size > 50) {
      this.cleanupCache(this.chatCache)
    }
  }

  /**
   * Limpia entradas expiradas del caché
   */
  private cleanupCache(cache: Map<string, CacheEntry>): void {
    const now = Date.now()
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        cache.delete(key)
      }
    }
  }

  /**
   * Limpia todo el caché
   */
  clearAll(): void {
    this.searchCache.clear()
    this.translationCache.clear()
    this.chatCache.clear()
    console.log('🧹 Caché limpiado completamente')
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats(): {
    searchCache: { size: number; entries: string[] }
    translationCache: { size: number; entries: string[] }
    chatCache: { size: number; entries: string[] }
  } {
    return {
      searchCache: {
        size: this.searchCache.size,
        entries: Array.from(this.searchCache.keys())
      },
      translationCache: {
        size: this.translationCache.size,
        entries: Array.from(this.translationCache.keys())
      },
      chatCache: {
        size: this.chatCache.size,
        entries: Array.from(this.chatCache.keys())
      }
    }
  }
}

// Exportar instancia singleton
export const cacheService = CacheService.getInstance()

// Funciones de utilidad para uso directo
export const getSearchCache = (query: string, keywords: string[]) => 
  cacheService.getSearchCache(query, keywords)

export const setSearchCache = (query: string, keywords: string[], products: any[]) => 
  cacheService.setSearchCache(query, keywords, products)

export const getTranslationCache = (text: string) => 
  cacheService.getTranslationCache(text)

export const setTranslationCache = (text: string, translation: string) => 
  cacheService.setTranslationCache(text, translation)

export const getChatCache = (message: string, context: string) => 
  cacheService.getChatCache(message, context)

export const setChatCache = (message: string, context: string, response: string) => 
  cacheService.setChatCache(message, context, response)

export const clearAllCache = () => cacheService.clearAll()
export const getCacheStats = () => cacheService.getStats()



