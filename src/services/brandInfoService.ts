// src/services/brandInfoService.ts
import { supabase } from '../lib/supabase'

export interface BrandInfo {
  id: number
  brand_name: string
  title: string
  content?: string // Opcional, ya que toda la info está en JSON
  json_data?: any // Para el JSON completo
  category?: string
  tags?: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StationInfo {
  id: string
  name: string
  type: string
  key_specs: any
  sensors: string[]
  features: string[]
  accessories: {
    optional: string[]
    recommended: string[]
  }
  recommended_for: string[]
}

export class BrandInfoService {
  
  /**
   * Obtiene todas las marcas
   */
  static async getAllBrandInfo(): Promise<BrandInfo[]> {
    try {
      if (!supabase) {
        console.warn('Supabase no está configurado')
        return []
      }

      const { data, error } = await supabase
        .from('brand_info')
        .select('*')
        .order('brand_name')

      if (error) {
        console.error('Error obteniendo información de marcas:', error)
        return []
      }

      return data as BrandInfo[]
    } catch (error) {
      console.error('Error in getAllBrandInfo:', error)
      return []
    }
  }

  /**
   * Crea una nueva información de marca
   */
  static async createBrandInfo(brandData: Omit<BrandInfo, 'id' | 'created_at' | 'updated_at'>): Promise<BrandInfo> {
    try {
      if (!supabase) {
        throw new Error('Supabase no está configurado')
      }

      const { data, error } = await supabase
        .from('brand_info')
        .insert([brandData])
        .select()
        .single()

      if (error) {
        console.error('Error creando información de marca:', error)
        throw error
      }

      return data as BrandInfo
    } catch (error) {
      console.error('Error in createBrandInfo:', error)
      throw error
    }
  }

  /**
   * Actualiza información de marca existente
   */
  static async updateBrandInfo(brandData: BrandInfo): Promise<BrandInfo> {
    try {
      if (!supabase) {
        throw new Error('Supabase no está configurado')
      }

      const { data, error } = await supabase
        .from('brand_info')
        .update({
          brand_name: brandData.brand_name,
          title: brandData.title,
          content: brandData.content,
          json_data: brandData.json_data,
          category: brandData.category,
          tags: brandData.tags,
          is_active: brandData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', brandData.id)
        .select()
        .single()

      if (error) {
        console.error('Error actualizando información de marca:', error)
        throw error
      }

      return data as BrandInfo
    } catch (error) {
      console.error('Error in updateBrandInfo:', error)
      throw error
    }
  }

  /**
   * Elimina información de marca
   */
  static async deleteBrandInfo(id: number): Promise<void> {
    try {
      if (!supabase) {
        throw new Error('Supabase no está configurado')
      }

      const { error } = await supabase
        .from('brand_info')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error eliminando información de marca:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in deleteBrandInfo:', error)
      throw error
    }
  }

  /**
   * Busca información de marcas relevante para una consulta
   */
  static async findRelevantBrandInfo(query: string): Promise<BrandInfo[]> {
    try {
      if (!supabase) {
        console.warn('Supabase no está configurado')
        return []
      }

      // Extraer palabras clave de la consulta (más flexible)
      const keywords = query.toLowerCase()
        .split(/[\s\-_]+/)
        .filter(word => word.length > 1)
        .concat([query.toLowerCase()])
      
      // Búsqueda más amplia: brand_name, title, category, tags y JSON
      const { data, error } = await supabase
        .from('brand_info')
        .select('*')
        .eq('is_active', true)
        .limit(10)

      if (error) {
        console.error('Error buscando información de marcas:', error)
        return []
      }

      if (!data || data.length === 0) {
        return []
      }

      // Filtrar resultados basado en relevancia
      const relevantBrands = data.filter(brand => {
        const searchText = [
          brand.brand_name,
          brand.title,
          brand.category,
          ...(brand.tags || [])
        ].join(' ').toLowerCase()

        // Buscar en el JSON si existe
        let jsonText = ''
        if (brand.json_data) {
          try {
            jsonText = JSON.stringify(brand.json_data).toLowerCase()
          } catch (e) {
            console.warn('Error procesando JSON de marca:', brand.brand_name)
          }
        }

        const fullText = `${searchText} ${jsonText}`

        // Verificar si alguna palabra clave coincide (búsqueda más flexible)
        return keywords.some(keyword => {
          const keywordLower = keyword.toLowerCase()
          return fullText.includes(keywordLower) ||
                 brand.brand_name.toLowerCase().includes(keywordLower) ||
                 brand.title.toLowerCase().includes(keywordLower) ||
                 (brand.tags && brand.tags.some(tag => tag.toLowerCase().includes(keywordLower)))
        })
      })

      // Ordenar por relevancia (más coincidencias primero)
      relevantBrands.sort((a, b) => {
        const aMatches = keywords.filter(keyword => 
          `${a.brand_name} ${a.title}`.toLowerCase().includes(keyword)
        ).length
        const bMatches = keywords.filter(keyword => 
          `${b.brand_name} ${b.title}`.toLowerCase().includes(keyword)
        ).length
        return bMatches - aMatches
      })

      
      return relevantBrands.slice(0, 5) // Limitar a 5 resultados
    } catch (error) {
      console.error('Error in findRelevantBrandInfo:', error)
      return []
    }
  }

  /**
   * Busca información de marcas por categoría
   */
  static async findBrandInfoByCategory(category: string): Promise<BrandInfo[]> {
    try {
      if (!supabase) {
        return []
      }

      const { data, error } = await supabase
        .from('brand_info')
        .select('*')
        .eq('is_active', true)
        .eq('category', category)
        .limit(10)

      if (error) {
        console.error('Error buscando marcas por categoría:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in findBrandInfoByCategory:', error)
      return []
    }
  }

  /**
   * Busca información de una marca específica
   */
  static async findBrandInfoByName(brandName: string): Promise<BrandInfo | null> {
    try {
      if (!supabase) {
        return null
      }

      const { data, error } = await supabase
        .from('brand_info')
        .select('*')
        .eq('is_active', true)
        .eq('brand_name', brandName)
        .single()

      if (error) {
        console.error('Error buscando marca específica:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in findBrandInfoByName:', error)
      return null
    }
  }

  /**
   * Búsqueda avanzada con texto completo
   */
  static async searchBrandInfoAdvanced(query: string): Promise<BrandInfo[]> {
    try {
      if (!supabase) {
        return []
      }

      // Usar búsqueda de texto completo si está disponible
      const { data, error } = await supabase
        .from('brand_info')
        .select('*')
        .eq('is_active', true)
        .textSearch('content', query, {
          type: 'websearch',
          config: 'spanish'
        })
        .limit(5)

      if (error) {
        console.error('Error en búsqueda avanzada de marcas:', error)
        // Fallback a búsqueda simple
        return await this.findRelevantBrandInfo(query)
      }

      return data || []
    } catch (error) {
      console.error('Error in searchBrandInfoAdvanced:', error)
      return await this.findRelevantBrandInfo(query)
    }
  }

  /**
   * Busca estaciones específicas en el JSON
   */
  static async findStationsByQuery(query: string): Promise<StationInfo[]> {
    try {
      if (!supabase) {
        return []
      }

      
      // Buscar en el JSON usando operadores de PostgreSQL
      const { data, error } = await supabase
        .from('brand_info')
        .select('json_data')
        .eq('is_active', true)
        .or(`json_data->'stations' @> '[{"name": {"$ilike": "%${query}%"}}]'::jsonb, json_data->'stations' @> '[{"type": {"$ilike": "%${query}%"}}]'::jsonb`)

      if (error) {
        console.error('Error buscando estaciones:', error)
        return []
      }

      const stations: StationInfo[] = []
      data?.forEach(brand => {
        if (brand.json_data?.stations) {
          brand.json_data.stations.forEach((station: any) => {
            if (station.name.toLowerCase().includes(query.toLowerCase()) ||
                station.type.toLowerCase().includes(query.toLowerCase()) ||
                station.sensors?.some((sensor: string) => sensor.toLowerCase().includes(query.toLowerCase()))) {
              stations.push(station)
            }
          })
        }
      })

      return stations
    } catch (error) {
      console.error('Error in findStationsByQuery:', error)
      return []
    }
  }

  /**
   * Obtiene información detallada de una estación específica
   */
  static async getStationDetails(stationId: string): Promise<StationInfo | null> {
    try {
      if (!supabase) {
        return null
      }

      const { data, error } = await supabase
        .from('brand_info')
        .select('json_data')
        .eq('is_active', true)
        .contains('json_data', { stations: [{ id: stationId }] })

      if (error) {
        console.error('Error obteniendo detalles de estación:', error)
        return null
      }

      if (data && data.length > 0) {
        const stations = data[0].json_data?.stations || []
        return stations.find((station: any) => station.id === stationId) || null
      }

      return null
    } catch (error) {
      console.error('Error in getStationDetails:', error)
      return null
    }
  }

  /**
   * Obtiene todas las marcas disponibles
   */
  static async getAllBrands(): Promise<string[]> {
    try {
      if (!supabase) {
        return []
      }

      const { data, error } = await supabase
        .from('brand_info')
        .select('brand_name')
        .eq('is_active', true)
        .order('brand_name')

      if (error) {
        console.error('Error obteniendo marcas:', error)
        return []
      }

      return data?.map(item => item.brand_name) || []
    } catch (error) {
      console.error('Error in getAllBrands:', error)
      return []
    }
  }
}
