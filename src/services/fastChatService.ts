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

      // Filtrar resultados basado en relevancia (incluyendo JSON y tags)
      const relevantProducts = data.filter(product => {
        // Crear texto de búsqueda completo incluyendo JSON
        const searchText = [
          product.name || '',
          product.description || '',
          product.categoria || '',
          ...(product.tags || []),
          // Incluir datos del JSON product_data
          ...(product.product_data ? [
            product.product_data.titulo || '',
            product.product_data.marca || '',
            product.product_data.modelo || '',
            ...(product.product_data.caracteristicas || []),
            ...(product.product_data.articulos_requeridos || []),
            ...(product.product_data.articulos_opcionales || [])
          ] : [])
        ].join(' ').toLowerCase()

        // Verificar si alguna palabra clave coincide
        return keywords.some(keyword => {
          const keywordLower = keyword.toLowerCase()
          return searchText.includes(keywordLower) ||
                 product.name.toLowerCase().includes(keywordLower) ||
                 (product.categoria && product.categoria.toLowerCase().includes(keywordLower)) ||
                 (product.tags && product.tags.some(tag => tag.toLowerCase().includes(keywordLower))) ||
                 // Buscar en JSON product_data
                 (product.product_data && (
                   (product.product_data.titulo && product.product_data.titulo.toLowerCase().includes(keywordLower)) ||
                   (product.product_data.marca && product.product_data.marca.toLowerCase().includes(keywordLower)) ||
                   (product.product_data.modelo && product.product_data.modelo.toLowerCase().includes(keywordLower)) ||
                   (product.product_data.caracteristicas && product.product_data.caracteristicas.some(c => c.toLowerCase().includes(keywordLower))) ||
                   (product.product_data.articulos_requeridos && product.product_data.articulos_requeridos.some(a => a.toLowerCase().includes(keywordLower))) ||
                   (product.product_data.articulos_opcionales && product.product_data.articulos_opcionales.some(a => a.toLowerCase().includes(keywordLower)))
                 ))
        })
      })

      // Ordenar por relevancia (más coincidencias primero)
      relevantProducts.sort((a, b) => {
        // Función para contar coincidencias en un producto
        const countMatches = (product) => {
          const searchText = [
            product.name || '',
            product.description || '',
            product.categoria || '',
            ...(product.tags || []),
            ...(product.product_data ? [
              product.product_data.titulo || '',
              product.product_data.marca || '',
              product.product_data.modelo || '',
              ...(product.product_data.caracteristicas || []),
              ...(product.product_data.articulos_requeridos || []),
              ...(product.product_data.articulos_opcionales || [])
            ] : [])
          ].join(' ').toLowerCase()
          
          return keywords.filter(keyword => 
            searchText.includes(keyword.toLowerCase())
          ).length
        }
        
        const aMatches = countMatches(a)
        const bMatches = countMatches(b)
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
