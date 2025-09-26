// src/components/BrandInfoAdmin.tsx
import React, { useState, useEffect, useRef } from 'react'
import { Plus, Search, Edit2, Trash2, Tag, FileText } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import Notification from './Notification'
import ConfirmDialog from './ConfirmDialog'
import TagsInput from './TagsInput'
import { BrandInfoService } from '../services/brandInfoService'

interface BrandInfo {
  id: number
  brand_name: string
  title: string
  content?: string
  json_data?: any
  category?: string
  tags?: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

const BrandInfoAdmin: React.FC = () => {
  const [brandInfo, setBrandInfo] = useState<BrandInfo[]>([])
  const [filteredBrandInfo, setFilteredBrandInfo] = useState<BrandInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingBrand, setEditingBrand] = useState<BrandInfo | null>(null)
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

  const { notifications, showSuccess, showError, removeNotification } = useNotifications()

  // Estados para el formulario
  const [formData, setFormData] = useState({
    brand_name: '',
    title: '',
    json_data: null as any,
    category: '',
    tags: [] as string[]
  })
  const [jsonInput, setJsonInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadBrandInfo()
  }, [])

  useEffect(() => {
    filterBrandInfo()
  }, [brandInfo, searchTerm])

  const filterBrandInfo = () => {
    if (!searchTerm.trim()) {
      setFilteredBrandInfo(brandInfo)
      return
    }

    const filtered = brandInfo.filter(brand =>
      brand.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brand.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brand.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brand.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredBrandInfo(filtered)
  }

  const loadBrandInfo = async () => {
    try {
      setLoading(true)
      const data = await BrandInfoService.getAllBrandInfo()
      setBrandInfo(data)
    } catch (error) {
      console.error('Error loading brand info:', error)
      showError('Error al cargar información de marcas')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (searchValue: string) => {
    setSearchTerm(searchValue)
  }

  const handleCreateBrand = async () => {
    try {
      await BrandInfoService.createBrandInfo(formData)
      setShowCreateModal(false)
      resetForm()
      loadBrandInfo()
      showSuccess('Información de marca creada exitosamente')
    } catch (error) {
      console.error('Error creating brand info:', error)
      showError('Error al crear información de marca')
    }
  }

  const handleUpdateBrand = async () => {
    if (!editingBrand) return
    
    try {
      await BrandInfoService.updateBrandInfo({ ...formData, id: editingBrand.id })
      setEditingBrand(null)
      resetForm()
      loadBrandInfo()
      showSuccess('Información de marca actualizada exitosamente')
    } catch (error) {
      console.error('Error updating brand info:', error)
      showError('Error al actualizar información de marca')
    }
  }

  const handleDeleteBrand = (id: number) => {
    const brand = brandInfo.find(b => b.id === id)
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Información de Marca',
      message: `¿Estás seguro de que quieres eliminar la información de "${brand?.brand_name}"? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        try {
          await BrandInfoService.deleteBrandInfo(id)
          loadBrandInfo()
          showSuccess('Información de marca eliminada exitosamente')
        } catch (error) {
          console.error('Error deleting brand info:', error)
          showError('Error al eliminar información de marca')
        } finally {
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })
        }
      }
    })
  }

  const resetForm = () => {
    setFormData({
      brand_name: '',
      title: '',
      json_data: null,
      category: '',
      tags: []
    })
    setJsonInput('')
    if (textareaRef.current) {
      textareaRef.current.value = ''
    }
  }

  const openEditModal = (brand: BrandInfo) => {
    setEditingBrand(brand)
    setFormData({
      brand_name: brand.brand_name,
      title: brand.title,
      json_data: brand.json_data,
      category: brand.category || '',
      tags: brand.tags || []
    })
    const jsonString = brand.json_data ? JSON.stringify(brand.json_data, null, 2) : ''
    setJsonInput(jsonString)
    if (textareaRef.current) {
      textareaRef.current.value = jsonString
    }
  }

  const handleJsonChange = (value: string) => {
    setJsonInput(value)
    try {
      if (value.trim()) {
        const parsed = JSON.parse(value)
        setFormData(prev => ({ ...prev, json_data: parsed }))
      } else {
        setFormData(prev => ({ ...prev, json_data: null }))
      }
    } catch (error) {
      // JSON inválido, pero mantenemos el texto para que el usuario pueda corregirlo
      setFormData(prev => ({ ...prev, json_data: null }))
    }
  }

  const validateJson = (): boolean => {
    if (!jsonInput.trim()) return true // JSON vacío es válido
    
    try {
      JSON.parse(jsonInput)
      return true
    } catch (error) {
      return false
    }
  }

  const loadJsonFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Verificar tamaño del archivo (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        showError('El archivo es demasiado grande. Máximo 2MB permitido.')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        console.log(`📁 Archivo cargado: ${file.name} (${file.size} bytes)`)
        
        // Usar el ref directamente para evitar limitaciones del state
        if (textareaRef.current) {
          textareaRef.current.value = content
        }
        
        setJsonInput(content)
        handleJsonChange(content)
        showSuccess(`Archivo ${file.name} cargado exitosamente`)
      }
      reader.onerror = () => {
        showError('Error al leer el archivo')
      }
      reader.readAsText(file, 'UTF-8')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Tag className="w-8 h-8 text-green-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Información de Marcas
                </h1>
                <p className="text-gray-600">
                  Gestiona textos explicativos sobre marcas y categorías
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Marca</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-green-500" />
                <span className="text-green-700 font-medium">Total Marcas</span>
              </div>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {brandInfo.length}
              </p>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="text-blue-700 font-medium">Activas</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {brandInfo.filter(b => b.is_active).length}
              </p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-purple-500" />
                <span className="text-purple-700 font-medium">Filtradas</span>
              </div>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {filteredBrandInfo.length}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex space-x-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar marcas... (nombre, título, contenido, categoría, tags)"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
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

        {/* Brand Info Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Marca
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Cargando información de marcas...
                    </td>
                  </tr>
                ) : filteredBrandInfo.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? 'No se encontraron marcas que coincidan con la búsqueda' : 'No se encontró información de marcas'}
                    </td>
                  </tr>
                ) : (
                  filteredBrandInfo.map((brand) => (
                    <tr key={brand.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {brand.brand_name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-md truncate">
                          {brand.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {brand.category || 'Sin categoría'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {brand.tags?.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                            >
                              {tag}
                            </span>
                          ))}
                          {brand.tags && brand.tags.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{brand.tags.length - 3} más
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(brand)}
                            className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBrand(brand.id)}
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
        </div>

        {/* Modal para crear/editar información de marca */}
        {(showCreateModal || editingBrand) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingBrand ? 'Editar Información de Marca' : 'Crear Nueva Información de Marca'}
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre de la Marca *
                      </label>
                      <input
                        type="text"
                        value={formData.brand_name}
                        onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Ej: Davis"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Categoría
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Ej: estaciones_meteorologicas"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="Ej: Estaciones Meteorológicas Davis - Líder en Precisión"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Datos JSON *
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <input
                            type="file"
                            accept=".json"
                            onChange={loadJsonFromFile}
                            className="text-sm text-gray-600"
                          />
                          <span className="text-xs text-gray-500">o pega el JSON directamente</span>
                        </div>
                        {jsonInput && (
                          <button
                            type="button"
                            onClick={() => {
                              setJsonInput('')
                              setFormData(prev => ({ ...prev, json_data: null }))
                              if (textareaRef.current) {
                                textareaRef.current.value = ''
                              }
                            }}
                            className="text-xs text-red-600 hover:text-red-800 px-2 py-1 border border-red-300 rounded hover:bg-red-50"
                          >
                            Limpiar JSON
                          </button>
                        )}
                      </div>
                      {jsonInput && (
                        <div className="text-xs text-gray-500">
                          📊 Caracteres: {jsonInput.length.toLocaleString()} | 
                          Líneas: {jsonInput.split('\n').length} |
                          Tamaño: {(new Blob([jsonInput]).size / 1024).toFixed(1)} KB
                        </div>
                      )}
                      <textarea
                        ref={textareaRef}
                        rows={15}
                        defaultValue={jsonInput}
                        onChange={(e) => {
                          const value = e.target.value
                          setJsonInput(value)
                          handleJsonChange(value)
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none font-mono text-xs ${
                          jsonInput && !validateJson() ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Pega aquí el JSON de la marca (ej: ejemplo-marca.json)..."
                        style={{ minHeight: '400px', maxHeight: '600px' }}
                      />
                      {jsonInput && !validateJson() && (
                        <p className="text-xs text-red-600">
                          ⚠️ JSON inválido. Por favor, verifica la sintaxis.
                        </p>
                      )}
                      {jsonInput && validateJson() && (
                        <p className="text-xs text-green-600">
                          ✅ JSON válido
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      El JSON contiene toda la información detallada de la marca: estaciones, sensores, especificaciones, accesorios, etc.
                    </p>
                  </div>

                  <div>
                    <TagsInput
                      value={formData.tags || []}
                      onChange={(tags) => setFormData({ ...formData, tags })}
                      availableTags={['davis', 'meteorologia', 'precision', 'confiabilidad', 'profesional', 'ambient', 'weather', 'wifi']}
                      placeholder="Escribe un tag y presiona Enter"
                      label="Tags (opcional)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Los tags ayudan a mejorar la precisión de las búsquedas y categorización.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setEditingBrand(null)
                      resetForm()
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={editingBrand ? handleUpdateBrand : handleCreateBrand}
                    disabled={!formData.brand_name || !formData.title || !jsonInput || !validateJson()}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                  >
                    {editingBrand ? 'Actualizar' : 'Crear'}
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

export default BrandInfoAdmin
