import React, { useRef, useState } from 'react'
import { Camera, X, Upload, Loader2, AlertTriangle } from 'lucide-react'
import { ImageSearchService } from '../services/imageSearchService'

interface ImageUploadProps {
  onImageSelect: (file: File) => void
  onImageRemove: () => void
  selectedImage: File | null
  isProcessing: boolean
  className?: string
  onError?: (error: string) => void
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelect,
  onImageRemove,
  selectedImage,
  isProcessing,
  className = '',
  onError
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleFileSelect = async (file: File) => {
    setValidationError(null)
    
    try {
      // Validación completa del archivo
      const validation = await ImageSearchService.validateImageComplete(file)
      
      if (!validation.valid) {
        const errorMessage = validation.error || 'Archivo no válido'
        setValidationError(errorMessage)
        if (onError) {
          onError(errorMessage)
        }
        return
      }

      // Si la validación es exitosa, proceder
      onImageSelect(file)
    } catch (error) {
      const errorMessage = 'Error al validar la imagen'
      setValidationError(errorMessage)
      if (onError) {
        onError(errorMessage)
      }
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleClick = () => {
    if (!isProcessing) {
      fileInputRef.current?.click()
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Determinar si es modo compacto (en barra de input)
  const isCompact = className.includes('w-12') || className.includes('h-12')

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isProcessing}
      />

      {selectedImage ? (
        // Imagen seleccionada
        <div className="relative">
          <div className={`relative ${isCompact ? 'w-12 h-12' : 'w-20 h-20'} rounded-lg overflow-hidden border-2 border-blue-500 bg-gray-100`}>
            <img
              src={URL.createObjectURL(selectedImage)}
              alt="Imagen seleccionada"
              className="w-full h-full object-cover"
            />
            {isProcessing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <Loader2 className={`${isCompact ? 'w-4 h-4' : 'w-6 h-6'} text-white animate-spin`} />
              </div>
            )}
          </div>
          
          <button
            onClick={onImageRemove}
            disabled={isProcessing}
            className={`absolute -top-1 -right-1 ${isCompact ? 'w-5 h-5' : 'w-6 h-6'} bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-full flex items-center justify-center transition-colors`}
            title="Eliminar imagen"
          >
            <X className={`${isCompact ? 'w-2 h-2' : 'w-3 h-3'}`} />
          </button>
          
          {!isCompact && (
            <div className="mt-1 text-xs text-gray-500 text-center">
              {selectedImage.name}
              <br />
              {formatFileSize(selectedImage.size)}
            </div>
          )}
        </div>
      ) : (
        // Botón de carga
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            ${isCompact ? 'w-12 h-12' : 'w-20 h-20'} border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors
            ${dragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          title={isProcessing ? 'Procesando imagen...' : 'Hacer clic o arrastrar imagen aquí'}
        >
          {isProcessing ? (
            <Loader2 className={`${isCompact ? 'w-4 h-4' : 'w-6 h-6'} text-gray-400 animate-spin`} />
          ) : (
            <Camera className={`${isCompact ? 'w-4 h-4' : 'w-6 h-6'} text-gray-400`} />
          )}
          {!isCompact && (
            <span className="text-xs text-gray-500 mt-1 text-center">
              {isProcessing ? 'Procesando...' : 'Subir foto'}
            </span>
          )}
        </div>
      )}

      {/* Información adicional - solo en modo no compacto */}
      {!selectedImage && !isProcessing && !isCompact && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          <p>JPG, PNG, WebP</p>
          <p>Máx. 5MB • 100x100 - 4096x4096px</p>
        </div>
      )}

      {/* Error de validación - solo en modo no compacto */}
      {validationError && !isCompact && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600">{validationError}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageUpload
