// src/services/chatService.ts
import { supabase, type Product } from '../lib/supabase'
import { translateIfNeeded } from './translationService'
import { getChatCache, setChatCache } from './cacheService'
import { BrandInfoService, type BrandInfo } from './brandInfoService'
import { EmbeddingService } from './embeddingService'
import { ImageSearchService } from './imageSearchService'

export class ChatService {
  
  /**
   * Busca información de marcas relevantes usando búsqueda semántica
   */
  static async findRelevantBrandInfo(query: string): Promise<BrandInfo[]> {
    try {
      const semanticResult = await EmbeddingService.semanticSearch({
        query,
        type: 'brands',
        similarity_threshold: 0.4, // Threshold más permisivo para mejor cobertura
        max_results: 3,
        use_cache: true
      })

      if (semanticResult.success && semanticResult.results.length > 0) {
        console.log(`🧠 Búsqueda semántica marcas: ${semanticResult.results.length} encontradas`)
        return semanticResult.results.map(result => result.metadata).filter(Boolean)
      }

      console.log('🔍 No se encontraron marcas relevantes con búsqueda semántica')
      return []
    } catch (error) {
      console.error('Error in findRelevantBrandInfo:', error)
      return []
    }
  }

  /**
   * Busca productos relevantes usando búsqueda semántica
   */
  static async findRelevantProducts(query: string): Promise<Product[]> {
    try {
      if (!supabase) {
        console.warn('Supabase no está configurado')
        return []
      }

      const semanticResult = await EmbeddingService.semanticSearch({
        query,
        type: 'products',
        similarity_threshold: 0.4, // Threshold más permisivo para mejor cobertura
        max_results: 5,
        use_cache: true
      })

      if (semanticResult.success && semanticResult.results.length > 0) {
        console.log(`🧠 Búsqueda semántica productos: ${semanticResult.results.length} encontrados`)
        return semanticResult.results.map(result => result.metadata).filter(Boolean)
      }

      console.log('🔍 No se encontraron productos relevantes con búsqueda semántica')
      return []
    } catch (error) {
      console.error('Error in findRelevantProducts:', error)
      return []
    }
  }

  /**
   * Procesa una imagen y busca el producto en la base de datos
   */
  static async processImage(
    imageFile: File,
    user_id?: string
  ): Promise<{
    success: boolean
    productFound: boolean
    product?: Product
    productName?: string
    message: string
    error?: string
  }> {
    try {
      // Convertir archivo a base64
      const imageBase64 = await ImageSearchService.fileToBase64(imageFile)
      
      // Procesar imagen y buscar producto
      const result = await ImageSearchService.processImageAndSearch(
        imageBase64,
        imageFile.type,
        user_id
      )

      return result
    } catch (error) {
      console.error('Error procesando imagen:', error)
      return {
        success: false,
        productFound: false,
        message: 'Error al procesar la imagen',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
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
