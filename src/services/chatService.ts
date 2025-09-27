// src/services/chatService.ts
import { supabase, type Product } from '../lib/supabase'
import { translateIfNeeded } from './translationService'
import { getSearchCache, setSearchCache, getChatCache, setChatCache } from './cacheService'
import { FastChatService } from './fastChatService'
import { BrandInfoService, type BrandInfo } from './brandInfoService'
import { EmbeddingService } from './embeddingService'

export class ChatService {
  
  /**
   * Busca información de marcas relevantes usando búsqueda semántica con fallback
   */
  static async findRelevantBrandInfo(query: string): Promise<BrandInfo[]> {
    try {
      // 1. Intentar búsqueda semántica primero
      try {
        const semanticResult = await EmbeddingService.semanticSearch({
          query,
          type: 'brands',
          similarity_threshold: 0.3,
          max_results: 3,
          use_cache: true
        })

        if (semanticResult.success && semanticResult.results.length > 0) {
          console.log(`🧠 Búsqueda semántica marcas: ${semanticResult.results.length} encontradas`)
          return semanticResult.results.map(result => result.metadata).filter(Boolean)
        }
      } catch (semanticError) {
        console.warn('Búsqueda semántica marcas falló, usando fallback:', semanticError)
      }

      // 2. Fallback a búsqueda tradicional
      const brandInfo = await BrandInfoService.findRelevantBrandInfo(query)
      return brandInfo
    } catch (error) {
      console.error('Error in findRelevantBrandInfo:', error)
      return []
    }
  }

  /**
   * Busca productos relevantes usando búsqueda semántica con fallback
   */
  static async findRelevantProducts(query: string): Promise<Product[]> {
    try {
      if (!supabase) {
        console.warn('Supabase no está configurado')
        return []
      }

      // 1. Intentar búsqueda semántica primero
      try {
        const semanticResult = await EmbeddingService.semanticSearch({
          query,
          type: 'products',
          similarity_threshold: 0.3,
          max_results: 5,
          use_cache: true
        })

        if (semanticResult.success && semanticResult.results.length > 0) {
          return semanticResult.results.map(result => result.metadata).filter(Boolean)
        }
      } catch (semanticError) {
        console.warn('Búsqueda semántica falló, usando fallback:', semanticError)
      }

      // 2. Fallback a búsqueda tradicional
      console.log('🔄 Usando búsqueda tradicional como fallback')
      const products = await FastChatService.findRelevantProducts(query)
      
      return products
    } catch (error) {
      console.error('Error in findRelevantProducts:', error)
      return []
    }
  }
  
  /**
   * Búsqueda optimizada usando search_vector
   */
  private static async optimizedProductSearch(query: string, limit: number = 10): Promise<Product[]> {
    if (!supabase) {
      return []
    }

    try {
      
      // Usar la nueva función optimizada con datos JSON
      
      // Probar primero con función JSON optimizada
      let { data, error } = await supabase.rpc('search_products_json_optimized', {
        search_query: query,
        product_type: null,
        categoria_filter: null,
        marca_filter: null,
        tags_filter: null,
        limit_count: limit,
        offset_count: 0
      })
      
      console.log('🔍 Resultado función simple:', { data: data?.length || 0, error })
      
      // Si no hay datos, probar con términos más simples
      if (!data || data.length === 0) {
        console.log('🔍 Probando con términos simplificados...')
        
        // Extraer palabras clave y probar una por una
        const keywords = this.extractKeywords(query)
        console.log('🔍 Keywords extraídas:', keywords)
        
        for (const keyword of keywords.slice(0, 3)) { // Probar solo las primeras 3
          console.log(`🔍 Probando con keyword: "${keyword}"`)
          const result = await supabase.rpc('search_products_json_optimized', {
            search_query: keyword,
            product_type: null,
            categoria_filter: null,
            marca_filter: null,
            tags_filter: null,
            limit_count: limit,
            offset_count: 0
          })
          
          if (result.data && result.data.length > 0) {
            console.log(`✅ Encontrados ${result.data.length} productos con "${keyword}"`)
            data = result.data
            error = result.error
            break
          }
        }
      }
      
      // Si aún no hay datos, probar con la función completa
      if (!data || data.length === 0) {
        console.log('🔍 Probando con función completa...')
        const result = await supabase.rpc('search_products_json_optimized', {
          search_query: query,
          product_type: null,
          categoria_filter: null,
          marca_filter: null,
          tags_filter: null,
          limit_count: limit,
          offset_count: 0
        })
        data = result.data
        error = result.error
      }
      
      console.log('🔍 Respuesta de la función:', { data, error })

      if (error) {
        console.error('Error en búsqueda optimizada:', error)
        console.log('🔄 Fallback a búsqueda simple...')
        // Fallback a búsqueda simple
        return await this.simpleProductSearch(query, limit)
      }

      return data || []
      
    } catch (error) {
      console.error('Error en optimizedProductSearch:', error)
      console.log('🔄 Fallback a búsqueda simple por error...')
      // Fallback a búsqueda simple
      return await this.simpleProductSearch(query, limit)
    }
  }

  /**
   * Búsqueda simple de productos (fallback confiable)
   */
  private static async simpleProductSearch(query: string, limit: number = 10): Promise<Product[]> {
    if (!supabase) {
      return []
    }

    try {
      console.log('🔍 Iniciando búsqueda simple para:', query)
      
      // Estrategia 1: Búsqueda directa con la consulta completa
      console.log('🔍 Estrategia 1: Búsqueda directa')
      let { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${query}%,categoria.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(limit)

      if (error) {
        console.error('Error en búsqueda directa:', error)
        return []
      }

      // Si encontramos resultados, devolverlos
      if (data && data.length > 0) {
        return data
      }

      // Estrategia 2: Búsqueda por palabras clave individuales
      console.log('🔍 Estrategia 2: Búsqueda por keywords')
      const keywords = this.extractKeywords(query)
      console.log('🔍 Keywords extraídas:', keywords)
      
      if (keywords.length > 0) {
        const orConditions = keywords.map(term => 
          `name.ilike.%${term}%,categoria.ilike.%${term}%,description.ilike.%${term}%`
        ).join(',')
        
        console.log('🔍 Condiciones de búsqueda por keywords:', orConditions)
        
        const { data: keywordData, error: keywordError } = await supabase
          .from('products')
          .select('*')
          .or(orConditions)
          .limit(limit)

        if (keywordError) {
          console.error('Error en búsqueda por keywords:', keywordError)
        } else if (keywordData && keywordData.length > 0) {
          return keywordData
        }
      }

      // Estrategia 2.5: Búsqueda por términos específicos de meteorología
      console.log('🔍 Estrategia 2.5: Búsqueda por términos meteorológicos')
      const weatherTerms = ['estacion', 'meteorologica', 'temperatura', 'humedad', 'viento', 'presion', 'clima']
      const foundTerms = weatherTerms.filter(term => 
        query.toLowerCase().includes(term) || keywords.some(k => k.includes(term))
      )
      
      if (foundTerms.length > 0) {
        const weatherConditions = foundTerms.map(term => 
          `name.ilike.%${term}%,categoria.ilike.%${term}%,description.ilike.%${term}%`
        ).join(',')
        
        const { data: weatherData, error: weatherError } = await supabase
          .from('products')
          .select('*')
          .or(weatherConditions)
          .limit(limit)

        if (weatherError) {
          console.error('Error en búsqueda meteorológica:', weatherError)
        } else if (weatherData && weatherData.length > 0) {
          return weatherData
        }
      }

      // Estrategia 3: Búsqueda más amplia (sin filtros estrictos)
      console.log('🔍 Probando búsqueda amplia...')
      const { data: broadData, error: broadError } = await supabase
        .from('products')
        .select('*')
        .limit(limit)

      if (broadError) {
        console.error('Error en búsqueda amplia:', broadError)
        return []
      }

      console.log(`🔍 Búsqueda amplia: ${broadData?.length || 0} productos totales`)
      return broadData || []
      
    } catch (error) {
      console.error('Error en simpleProductSearch:', error)
      return []
    }
  }

  /**
   * Extrae palabras clave de la consulta del usuario
   */
  static extractKeywords(query: string): string[] {
    // Palabras comunes que podemos ignorar (stop words en español)
    const stopWords = [
      'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 
      'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'una',
      'necesito', 'quiero', 'busco', 'tengo', 'estoy', 'comprar',
      'adquirir', 'buscando', 'para', 'con', 'del', 'las', 'los'
    ]
    
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remover puntuación
      .split(/\s+/)
      .filter(word => word.length > 1)
      .filter(word => !stopWords.includes(word))
      .filter(word => !/^\d+$/.test(word)) // Remover números puros
      .filter(word => word.length <= 20) // Remover palabras muy largas (probablemente errores)
  }
  
  /**
   * Envía mensaje al chatbot y obtiene respuesta con caché
   */
  static async sendMessage(
    message: string, 
    chatHistory: Array<{role: string, content: string}> = []
  ): Promise<{ 
    response: string; 
    translationInfo?: { wasTranslated: boolean; detectedLanguage: string };
  }> {
    try {
      if (!supabase) {
        return {
          response: 'Lo siento, el servicio no está configurado correctamente. Por favor contacta al administrador.',
          translationInfo: { wasTranslated: false, detectedLanguage: 'es' }
        }
      }

      // Verificar caché de chat
      const chatCacheKey = `chat:${message}:${JSON.stringify(chatHistory)}`
      const cachedResponse = getChatCache(chatCacheKey, '')
      if (cachedResponse) {
        console.log('Cache hit for chat message')
        try {
          return JSON.parse(cachedResponse)
        } catch {
          return {
            response: cachedResponse,
            translationInfo: { wasTranslated: false, detectedLanguage: 'es' }
          }
        }
      }

      // 1. Traducir mensaje si es necesario
      const messageTranslation = await translateIfNeeded(message)
      const processedMessage = messageTranslation.translatedText || message
      
      // 2. Buscar productos relevantes
      const relevantProducts = await this.findRelevantProducts(processedMessage)
      
      // 3. Buscar información de marcas relevantes
      const relevantBrandInfo = await this.findRelevantBrandInfo(processedMessage)
      
      // 4. Llamar a la Edge Function de Supabase
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          message: processedMessage,
          originalMessage: message,
          chatHistory,
          products: relevantProducts,
          brandInfo: relevantBrandInfo,
          translationInfo: {
            wasTranslated: messageTranslation.isTranslated,
            detectedLanguage: messageTranslation.detectedLanguage
          }
        }
      })
      
      if (error) {
        throw error
      }
      
      const result = {
        response: data.response || 'Lo siento, no pude procesar tu consulta.',
        translationInfo: {
          wasTranslated: messageTranslation.isTranslated,
          detectedLanguage: messageTranslation.detectedLanguage
        }
      }
      
      // Guardar en caché
      setChatCache(chatCacheKey, '', JSON.stringify(result))
      
      return result
    } catch (error) {
      console.error('Error in chat service:', error)
      return {
        response: 'Lo siento, ocurrió un error al procesar tu consulta. Por favor intenta de nuevo.',
        translationInfo: { wasTranslated: false, detectedLanguage: 'es' }
      }
    }
  }
}
