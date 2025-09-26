// src/services/adminService.ts
import { supabase, type Product } from '../lib/supabase'

export interface CreateProductData {
  name: string
  description: string
  categoria: string
  type: 'equipo' | 'accesorio' | 'suministro'
  tags?: string[]
  product_data?: {
    titulo?: string
    subtitulo?: string
    marca?: string
    modelo?: string
    caracteristicas?: string[]
    especificaciones?: any
    articulos_requeridos?: string[]
    articulos_opcionales?: string[]
    contenido_caja?: string[]
    documentos?: any[]
    imagenes?: string[]
  }
}

export interface UpdateProductData extends Partial<CreateProductData> {
  id: number
}

export class AdminService {
  
  /**
   * Obtiene todos los productos con paginación
   */
  static async getProducts(page: number = 1, limit: number = 10): Promise<{
    products: Product[]
    total: number
    hasMore: boolean
  }> {
    try {
      if (!supabase) {
        throw new Error('Supabase no está configurado')
      }

      const from = (page - 1) * limit
      const to = from + limit - 1

      // Obtener productos con paginación
      const { data, error, count } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      return {
        products: data || [],
        total: count || 0,
        hasMore: (count || 0) > to + 1
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      throw new Error('No se pudieron cargar los productos')
    }
  }

  /**
   * Busca productos por término
   */
  static async searchProducts(searchTerm: string): Promise<Product[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase no está configurado')
      }

      if (!searchTerm.trim()) {
        const result = await this.getProducts(1, 50)
        return result.products
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,categoria.ilike.%${searchTerm}%`)
        .order('name')
        .limit(50)

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error searching products:', error)
      throw new Error('Error en la búsqueda de productos')
    }
  }

  /**
   * Crea un nuevo producto
   */
  static async createProduct(productData: CreateProductData): Promise<Product> {
    try {
      if (!supabase) {
        throw new Error('Supabase no está configurado')
      }

      // Verificar si ya existe un producto con el mismo nombre
      const { data: existingProduct, error: checkError } = await supabase
        .from('products')
        .select('id, name')
        .ilike('name', productData.name)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw new Error('Error verificando productos existentes')
      }

      if (existingProduct) {
        throw new Error(`Ya existe un producto con el nombre "${productData.name}". Por favor, usa un nombre diferente.`)
      }

      // Preparar datos con estructura JSON por defecto
      const { product_data, tags, ...basicData } = productData
      const defaultProductData = {
        titulo: productData.name,
        descripcion: productData.description,
        marca: 'Sin especificar',
        modelo: 'Sin especificar',
        caracteristicas: [productData.description],
        especificaciones: {},
        articulos_requeridos: [],
        articulos_opcionales: [],
        contenido_caja: [],
        documentos: [],
        imagenes: [],
        ...product_data
      }

      // Generar tags automáticos si no se proporcionan
      const autoTags = tags || [
        productData.type,
        productData.categoria.toLowerCase().replace(/\s+/g, '_'),
        'producto'
      ]

      const insertData = {
        ...basicData,
        tags: autoTags,
        product_data: defaultProductData
      }

      const { data, error } = await supabase
        .from('products')
        .insert([insertData])
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error creating product:', error)
      throw new Error('No se pudo crear el producto')
    }
  }

  /**
   * Actualiza un producto existente
   */
  static async updateProduct(productData: UpdateProductData): Promise<Product> {
    try {
      if (!supabase) {
        throw new Error('Supabase no está configurado')
      }

      const { id, product_data, tags, ...basicData } = productData
      
      // Si se proporciona product_data, actualizar también
      let updateData: any = { ...basicData }
      
      if (product_data) {
        // Obtener datos actuales del producto
        const { data: currentProduct } = await supabase
          .from('products')
          .select('product_data')
          .eq('id', id)
          .single()
        
        // Fusionar datos existentes con nuevos
        const currentData = currentProduct?.product_data || {}
        updateData.product_data = { ...currentData, ...product_data }
      }

      // Actualizar tags si se proporcionan
      if (tags) {
        updateData.tags = tags
      }
      
      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error updating product:', error)
      throw new Error('No se pudo actualizar el producto')
    }
  }

  /**
   * Elimina un producto
   */
  static async deleteProduct(id: number): Promise<void> {
    try {
      if (!supabase) {
        throw new Error('Supabase no está configurado')
      }

      console.log('Eliminando producto con ID:', id)
      
      // Primero verificar que el producto existe
      const { data: existingProduct, error: fetchError } = await supabase
        .from('products')
        .select('id, name')
        .eq('id', id)
        .single()

      console.log('Verificación de producto:', { existingProduct, fetchError })

      if (fetchError || !existingProduct) {
        console.error('Error al verificar producto:', fetchError)
        throw new Error(`No se encontró el producto con ID ${id} para eliminar`)
      }

      // Ahora eliminar el producto
      const { error, data } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .select()

      console.log('Resultado de eliminación:', { error, data })

      if (error) {
        console.error('Error de Supabase:', error)
        throw new Error(`Error de Supabase: ${error.message}`)
      }

      // Verificar que se eliminó el producto
      if (!data || data.length === 0) {
        throw new Error(`No se pudo eliminar el producto con ID ${id} - no se encontraron registros afectados`)
      }

      console.log(`Producto "${existingProduct.name}" (ID: ${id}) eliminado exitosamente`)
    } catch (error) {
      console.error('Error deleting product:', error)
      throw new Error('No se pudo eliminar el producto')
    }
  }

  /**
   * Obtiene estadísticas básicas
   */
  static async getStats(): Promise<{
    totalProducts: number
    productsByType: Record<string, number>
    categorias: string[]
    marcas: string[]
    tags: string[]
  }> {
    try {
      if (!supabase) {
        return {
          totalProducts: 0,
          productsByType: {},
          categorias: [],
          marcas: [],
          tags: []
        }
      }

      // Total de productos
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      // Productos por tipo
      const { data: typeData } = await supabase
        .from('products')
        .select('type')

      const productsByType = typeData?.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      // Categorías únicas
      const { data: categoriaData } = await supabase
        .from('products')
        .select('categoria')

      const categorias = [...new Set(categoriaData?.map(item => item.categoria) || [])]

      // Marcas únicas (desde product_data JSON)
      const { data: productData } = await supabase
        .from('products')
        .select('product_data')

      const marcas = [...new Set(
        productData?.map(item => item.product_data?.marca).filter(Boolean) || []
      )]

      // Tags únicos
      const { data: tagsData } = await supabase
        .from('products')
        .select('tags')

      const allTags = tagsData?.flatMap(item => item.tags || []) || []
      const tags = [...new Set(allTags)]

      return {
        totalProducts: totalProducts || 0,
        productsByType,
        categorias,
        marcas,
        tags
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      return {
        totalProducts: 0,
        productsByType: {},
        categorias: [],
        marcas: [],
        tags: []
      }
    }
  }
}