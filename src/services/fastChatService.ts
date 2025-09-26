// src/services/fastChatService.ts
import { supabase, type Product } from '../lib/supabase'

export class FastChatService {
  
  /**
   * Búsqueda rápida y simple de productos
   */
  static async findRelevantProducts(query: string): Promise<Product[]> {
    const startTime = Date.now()
    
    try {
      if (!supabase) {
        console.warn('Supabase no está configurado')
        return []
      }

      // Extraer palabras clave de la consulta
      const keywords = query.toLowerCase()
        .split(/[\s\-_]+/)
        .filter(word => word.length > 1)
        .concat([query.toLowerCase()])
      
      // Búsqueda simple en productos
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .limit(20)

      if (error) {
        console.error('Error buscando productos:', error)
        return []
      }

      if (!data || data.length === 0) {
        return []
      }

      // Filtrar resultados basado en relevancia
      const relevantProducts = data.filter(product => {
        const searchText = [
          product.name || '',
          product.description || '',
          product.category || '',
          ...(product.tags || [])
        ].join(' ').toLowerCase()

        // Verificar si alguna palabra clave coincide
        return keywords.some(keyword => {
          const keywordLower = keyword.toLowerCase()
          return searchText.includes(keywordLower) ||
                 product.name.toLowerCase().includes(keywordLower) ||
                 (product.category && product.category.toLowerCase().includes(keywordLower)) ||
                 (product.tags && product.tags.some(tag => tag.toLowerCase().includes(keywordLower)))
        })
      })

      // Ordenar por relevancia (más coincidencias primero)
      relevantProducts.sort((a, b) => {
        const aMatches = keywords.filter(keyword => 
          `${a.name} ${a.description}`.toLowerCase().includes(keyword)
        ).length
        const bMatches = keywords.filter(keyword => 
          `${b.name} ${b.description}`.toLowerCase().includes(keyword)
        ).length
        return bMatches - aMatches
      })
      
      const endTime = Date.now()
      
      return relevantProducts.slice(0, 10) // Limitar a 10 resultados
    } catch (error) {
      console.error('Error in findRelevantProducts:', error)
      return []
    }
  }
}
