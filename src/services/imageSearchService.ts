// src/services/imageSearchService.ts
import { supabase } from '../lib/supabase'

export interface ImageAnalysisRequest {
  imageBase64: string
  imageType: string
  user_id?: string
  source?: string
}

export interface ImageAnalysisResponse {
  success: boolean
  productName?: string
  productDescription?: string
  confidence?: number
  error?: string
  processing_time_ms: number
}

export interface ProductSearchResult {
  found: boolean
  product?: any
  similarProducts?: any[]
  message: string
  scenario: 'exact_match' | 'similar_products' | 'no_match' | 'recognition_failed'
}

export class ImageSearchService {
  
  /**
   * Analiza una imagen y extrae información del producto
   */
  static async analyzeImage(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse> {
    const startTime = Date.now()
    
    try {
      if (!supabase) {
        return {
          success: false,
          error: 'Cliente Supabase no inicializado',
          processing_time_ms: Date.now() - startTime
        }
      }

      // Llamar a la Edge Function de análisis de imagen
      const { data, error } = await supabase.functions.invoke('image-analysis', {
        body: request
      })

      if (error) {
        console.error('Error en análisis de imagen:', error)
        return {
          success: false,
          error: error.message,
          processing_time_ms: Date.now() - startTime
        }
      }

      return {
        ...data,
        processing_time_ms: Date.now() - startTime
      }
    } catch (error) {
      console.error('Error en analyzeImage:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        processing_time_ms: Date.now() - startTime
      }
    }
  }

  /**
   * Busca un producto en la base de datos basado en el nombre extraído de la imagen
   */
  static async searchProductInDatabase(productName: string): Promise<ProductSearchResult> {
    try {
      if (!supabase) {
      return {
        found: false,
        message: 'Cliente Supabase no inicializado',
        scenario: 'recognition_failed'
      }
      }

      // Usar búsqueda semántica para encontrar el producto
      const { data, error } = await supabase.functions.invoke('semantic-search', {
        body: {
          query: productName,
          type: 'products',
                  similarity_threshold: 0.5, // Threshold más estricto para mejor precisión
          max_results: 5,
          use_cache: true
        }
      })

      if (error) {
        console.error('Error buscando producto en BD:', error)
        return {
          found: false,
          message: 'Error al buscar en la base de datos',
          scenario: 'recognition_failed'
        }
      }

      if (data?.success && data.results.length > 0) {
        const bestMatch = data.results[0]
        
        console.log(`🔍 Mejor coincidencia: "${bestMatch.metadata.name}" con similitud ${bestMatch.similarity}`)
        
                // Threshold más permisivo para coincidencias exactas
                if (bestMatch.similarity > 0.7) {
                  return {
                    found: true,
                    product: bestMatch.metadata,
                    message: `Producto encontrado: ${bestMatch.metadata.name}`,
                    scenario: 'exact_match'
                  }
                }
                
                // Si no hay coincidencia exacta, verificar si hay productos similares
                if (data.results.length > 0) {
                  const topResults = data.results.slice(0, 2) // Máximo 2 productos similares
                  console.log('🔍 Productos similares encontrados:', topResults.map((r: any) => `${r.metadata.name} (${r.similarity})`))
                  
                  // Solo considerar similares si tienen similitud > 0.6 (más estricto)
                  const validSimilarProducts = topResults.filter((r: any) => r.similarity > 0.6)
                  
                  if (validSimilarProducts.length > 0) {
                    return {
                      found: false,
                      message: `No tenemos exactamente "${productName}", pero tenemos productos similares: ${validSimilarProducts.map((r: any) => r.metadata.name).join(', ')}`,
                      similarProducts: validSimilarProducts.map((r: any) => r.metadata),
                      scenario: 'similar_products'
                    }
                  }
                }
      }

      return {
        found: false,
        message: `No tenemos el producto "${productName}" ni productos similares en nuestro catálogo`,
        scenario: 'no_match'
      }
    } catch (error) {
      console.error('Error en searchProductInDatabase:', error)
      return {
        found: false,
        message: 'Error al buscar en la base de datos',
        scenario: 'recognition_failed'
      }
    }
  }

  /**
   * Proceso completo: analizar imagen y buscar producto
   */
  static async processImageAndSearch(
    imageBase64: string, 
    imageType: string,
    user_id?: string
  ): Promise<{
    success: boolean
    productFound: boolean
    product?: any
    productName?: string
    message: string
    error?: string
    scenario?: 'exact_match' | 'similar_products' | 'no_match' | 'recognition_failed'
    similarProducts?: any[]
  }> {
    try {
      // 1. Analizar la imagen
      const analysisResult = await this.analyzeImage({
        imageBase64,
        imageType,
        user_id,
        source: 'chat'
      })

      if (!analysisResult.success || !analysisResult.productName) {
        return {
          success: false,
          productFound: false,
          message: 'Lo siento, no pude reconocer claramente el producto en la imagen. Por favor, intenta con una imagen más clara o describe el producto que buscas.',
          error: analysisResult.error,
          scenario: 'recognition_failed'
        }
      }

      // 2. Buscar el producto en la base de datos
      const searchResult = await this.searchProductInDatabase(analysisResult.productName)

      return {
        success: true,
        productFound: searchResult.found,
        product: searchResult.product,
        productName: analysisResult.productName,
        message: searchResult.message,
        scenario: searchResult.scenario,
        similarProducts: searchResult.similarProducts
      }
    } catch (error) {
      console.error('Error en processImageAndSearch:', error)
      return {
        success: false,
        productFound: false,
        message: 'Error al procesar la imagen',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  /**
   * Convierte un archivo a base64
   */
  static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remover el prefijo "data:image/...;base64,"
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * Valida si un archivo es una imagen válida
   */
  static validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024 // 5MB (reducido para mejor rendimiento)
    const minSize = 1024 // 1KB mínimo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    // const maxDimensions = { width: 4096, height: 4096 } // Máximo 4K

    // Validar tamaño del archivo
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `La imagen es demasiado grande. Máximo ${Math.round(maxSize / 1024 / 1024)}MB.`
      }
    }

    if (file.size < minSize) {
      return {
        valid: false,
        error: 'La imagen es demasiado pequeña. Mínimo 1KB.'
      }
    }

    // Validar tipo de archivo
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Formato no soportado. Use JPG, PNG o WebP.'
      }
    }

    // Validar extensión del archivo (doble verificación)
    const fileName = file.name.toLowerCase()
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext))
    
    if (!hasValidExtension) {
      return {
        valid: false,
        error: 'Extensión de archivo no válida. Use .jpg, .jpeg, .png o .webp.'
      }
    }

    return { valid: true }
  }

  /**
   * Valida las dimensiones de una imagen
   */
  static async validateImageDimensions(file: File): Promise<{ valid: boolean; error?: string; dimensions?: { width: number; height: number } }> {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(url)
        
        const maxWidth = 4096
        const maxHeight = 4096
        const minWidth = 100
        const minHeight = 100
        
        if (img.width > maxWidth || img.height > maxHeight) {
          resolve({
            valid: false,
            error: `Las dimensiones son demasiado grandes. Máximo ${maxWidth}x${maxHeight} píxeles.`,
            dimensions: { width: img.width, height: img.height }
          })
        }
        
        if (img.width < minWidth || img.height < minHeight) {
          resolve({
            valid: false,
            error: `Las dimensiones son demasiado pequeñas. Mínimo ${minWidth}x${minHeight} píxeles.`,
            dimensions: { width: img.width, height: img.height }
          })
        }
        
        resolve({
          valid: true,
          dimensions: { width: img.width, height: img.height }
        })
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve({
          valid: false,
          error: 'No se pudo cargar la imagen. Verifique que sea un archivo válido.'
        })
      }
      
      img.src = url
    })
  }

  /**
   * Validación completa de imagen
   */
  static async validateImageComplete(file: File): Promise<{ valid: boolean; error?: string; dimensions?: { width: number; height: number } }> {
    // 1. Validación básica del archivo
    const basicValidation = this.validateImageFile(file)
    if (!basicValidation.valid) {
      return basicValidation
    }

    // 2. Validación de dimensiones
    const dimensionValidation = await this.validateImageDimensions(file)
    if (!dimensionValidation.valid) {
      return dimensionValidation
    }

    return {
      valid: true,
      dimensions: dimensionValidation.dimensions
    }
  }
}
