import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Package, BarChart3, Info, Brain } from 'lucide-react'
import { type Product } from '../lib/supabase'
import { AdminService, type CreateProductData } from '../services/adminService'
import { OptimizedSearchService } from '../services/optimizedSearchService'
import { useNotifications } from '../hooks/useNotifications'
import Notification from './Notification'
import ConfirmDialog from './ConfirmDialog'
import HtmlPreview from './HtmlPreview'
import AutocompleteInput from './AutocompleteInput'
import TagsInput from './TagsInput'
import BrandInfoAdmin from './BrandInfoAdmin'
import EmbeddingGenerator from './EmbeddingGenerator'

const AdminPage: React.FC = () => {
  const PRODUCTS_PER_PAGE = 10
  
  const [activeTab, setActiveTab] = useState<'products' | 'brands' | 'embeddings'>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })
  const [stats, setStats] = useState({
    totalProducts: 0,
    productsByType: {} as Record<string, number>,
    categorias: [] as string[],
    marcas: [] as string[],
    tags: [] as string[]
  })

  const { notifications, showSuccess, showError, removeNotification } = useNotifications()

  // Estados para el formulario
  const [formData, setFormData] = useState<CreateProductData>({
    name: '',
    description: '',
    categoria: '',
    type: 'equipo',
    tags: []
  })

  useEffect(() => {
    loadProducts()
    loadStats()
  }, [])

  // Función para filtrar productos en tiempo real (optimizada)
  const filterProducts = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products)
      setCurrentPage(1)
      return
    }

    try {
      // Usar búsqueda optimizada para términos de búsqueda complejos
      if (searchTerm.length > 2) {
        const searchResult = await OptimizedSearchService.searchProducts({
          query: searchTerm,
          limit: 100 // Limitar para la interfaz
        })
        setFilteredProducts(searchResult.products)
      } else {
        // Para búsquedas cortas, usar filtrado local
        const filtered = products.filter(product =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product as any).categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.type.toLowerCase().includes(searchTerm.toLowerCase())
        )
        setFilteredProducts(filtered)
      }
      setCurrentPage(1)
    } catch (error) {
      console.error('Error in optimized search:', error)
      // Fallback a búsqueda local
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product as any).categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.type.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredProducts(filtered)
      setCurrentPage(1)
    }
  }

  // Función para obtener productos de la página actual
  const getCurrentPageProducts = () => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE
    const endIndex = startIndex + PRODUCTS_PER_PAGE
    return filteredProducts.slice(startIndex, endIndex)
  }

  // Actualizar paginación cuando cambien los productos filtrados
  useEffect(() => {
    const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE)
    setTotalPages(totalPages)
    
    // Si la página actual es mayor que el total de páginas, ir a la primera
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [filteredProducts, currentPage])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const result = await AdminService.getProducts(1, 100)
      setProducts(result.products || [])
      setFilteredProducts(result.products || []) // Inicializar productos filtrados
    } catch (error) {
      console.error('Error loading products:', error)
      showError('Error al cargar productos')
      setProducts([]) // Limpiar la lista en caso de error
      setFilteredProducts([])
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const stats = await AdminService.getStats()
      setStats(stats)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleSearch = (searchValue: string) => {
    setSearchTerm(searchValue)
    filterProducts(searchValue)
  }

  const handleCreateProduct = async () => {
    try {
      // Ya no necesitamos limpiar HTML, se guarda tal como se ingresa
      await AdminService.createProduct(formData)
      setShowCreateModal(false)
      resetForm()
      loadProducts()
      loadStats()
      showSuccess('Producto creado exitosamente')
    } catch (error) {
      console.error('Error creating product:', error)
      showError('Error al crear producto')
    }
  }

  const handleUpdateProduct = async () => {
    if (!editingProduct) return
    
    try {
      // Ya no necesitamos limpiar HTML, se guarda tal como se ingresa
      const updateData = {
        ...formData,
        id: editingProduct.id
      }
      
      await AdminService.updateProduct(updateData)
      setEditingProduct(null)
      resetForm()
      loadProducts()
      showSuccess('Producto actualizado exitosamente')
    } catch (error) {
      console.error('Error updating product:', error)
      showError('Error al actualizar producto')
    }
  }

  const handleDeleteProduct = (id: number) => {
    const product = products.find(p => p.id === id)
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Producto',
      message: `¿Estás seguro de que quieres eliminar "${product?.name}"? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        try {
          await AdminService.deleteProduct(id)
          
          // Actualizar la lista local inmediatamente
          setProducts(prevProducts => prevProducts.filter(product => product.id !== id))
          
          // Recargar desde la base de datos para asegurar consistencia
          await loadProducts()
          await loadStats()
          
          showSuccess('Producto eliminado exitosamente')
        } catch (error) {
          console.error('Error deleting product:', error)
          showError('Error al eliminar producto')
        } finally {
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })
        }
      }
    })
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      categoria: '',
      type: 'equipo',
      tags: []
    })
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description,
      categoria: (product as any).categoria || '',
      type: product.type as 'equipo' | 'accesorio' | 'suministro',
      tags: (product as any).tags || []
    })
  }

  return (
    <div className="h-full bg-gray-50 p-4 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {activeTab === 'products' ? (
                <Package className="w-8 h-8 text-blue-500" />
              ) : activeTab === 'brands' ? (
                <Info className="w-8 h-8 text-purple-500" />
              ) : (
                <Brain className="w-8 h-8 text-green-500" />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {activeTab === 'products' ? 'Administración de Productos' : 
                   activeTab === 'brands' ? 'Administración de Marcas' : 
                   'Sistema de Embeddings'}
                </h1>
                <p className="text-gray-600">
                  {activeTab === 'products' ? 'Gestiona el catálogo para el chatbot' : 
                   activeTab === 'brands' ? 'Gestiona información detallada de marcas' :
                   'Genera embeddings semánticos para búsquedas inteligentes'}
                </p>
              </div>
            </div>
            
            {activeTab === 'products' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Producto</span>
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'products'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Productos</span>
            </button>
            <button
              onClick={() => setActiveTab('brands')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'brands'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>Información de Marcas</span>
            </button>
            <button
              onClick={() => setActiveTab('embeddings')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'embeddings'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>Embeddings</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <span className="text-blue-700 font-medium">Total</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {stats.totalProducts}
              </p>
            </div>
            
            {Object.entries(stats.productsByType).map(([type, count]) => (
              <div key={type} className="bg-green-50 rounded-lg p-4">
                <span className="text-green-700 font-medium capitalize">{type}s</span>
                <p className="text-2xl font-bold text-green-900 mt-1">{count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'products' ? (
          <>
            {/* Search */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex space-x-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar productos... (escribe para filtrar en tiempo real)"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <button
              onClick={() => handleSearch('')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>Limpiar</span>
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoría
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      Cargando productos...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? 'No se encontraron productos que coincidan con la búsqueda' : 'No se encontraron productos'}
                    </td>
                  </tr>
                ) : (
                  getCurrentPageProducts().map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500 max-w-md truncate">
                            {product.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(product as any).categoria || 'Sin categoría'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.type === 'equipo' ? 'bg-blue-100 text-blue-800' :
                          product.type === 'accesorio' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {product.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Controles de paginación */}
          {filteredProducts.length > PRODUCTS_PER_PAGE && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando{' '}
                      <span className="font-medium">
                        {Math.min((currentPage - 1) * PRODUCTS_PER_PAGE + 1, filteredProducts.length)}
                      </span>{' '}
                      a{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)}
                      </span>{' '}
                      de{' '}
                      <span className="font-medium">{filteredProducts.length}</span>{' '}
                      resultados
                      {searchTerm && (
                        <span className="text-blue-600"> (filtrados por: "{searchTerm}")</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Anterior</span>
                        ←
                      </button>
                      
                      {/* Números de página */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                        if (pageNum > totalPages) return null
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNum
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Siguiente</span>
                        →
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal para crear/editar producto */}
        {(showCreateModal || editingProduct) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Ej: EstacionPro WSX-4000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción Completa *
                    </label>
                    <textarea
                      rows={6}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Descripción detallada con características técnicas, aplicaciones, especificaciones... (Puedes pegar HTML que será convertido automáticamente a texto plano para el chatbot)"
                    />
                    
                    {/* Vista previa del HTML limpio */}
                    <HtmlPreview htmlContent={formData.description} />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <AutocompleteInput
                        value={formData.categoria}
                        onChange={(value) => setFormData({ ...formData, categoria: value })}
                        options={stats.categorias}
                        placeholder="Ej: Estaciones Meteorológicas"
                        label="Categoría"
                        required={true}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo *
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'equipo' | 'accesorio' | 'suministro' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="equipo">Equipo</option>
                        <option value="accesorio">Accesorio</option>
                        <option value="suministro">Suministro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <TagsInput
                      value={formData.tags || []}
                      onChange={(tags) => setFormData({ ...formData, tags })}
                      availableTags={stats.tags}
                      placeholder="Escribe un tag y presiona Enter"
                      label="Tags (opcional)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Los tags ayudan a mejorar la precisión de las búsquedas. Usa tags existentes o crea nuevos.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setEditingProduct(null)
                      resetForm()
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={editingProduct ? handleUpdateProduct : handleCreateProduct}
                    disabled={!formData.name || !formData.description || !formData.categoria}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                  >
                    {editingProduct ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notificaciones */}
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            type={notification.type}
            message={notification.message}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
          </>
        ) : activeTab === 'brands' ? (
          <BrandInfoAdmin />
        ) : (
          <div className="space-y-6">
            <EmbeddingGenerator />
          </div>
        )}

        {/* Diálogo de confirmación */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="Eliminar"
          cancelText="Cancelar"
          type="danger"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
        />
      </div>
    </div>
  )
}

export default AdminPage