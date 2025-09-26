import React, { useState } from 'react'
import { Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react'
import { cleanProductDescription, hasDangerousContent, getTextPreview } from '../utils/htmlCleaner'

interface HtmlPreviewProps {
  htmlContent: string
  maxPreviewLength?: number
}

const HtmlPreview: React.FC<HtmlPreviewProps> = ({ 
  htmlContent, 
  maxPreviewLength = 200 
}) => {
  const [showPreview, setShowPreview] = useState(false)
  
  if (!htmlContent || htmlContent.trim() === '') {
    return null
  }

  const hasDangerous = hasDangerousContent(htmlContent)
  const cleanedText = cleanProductDescription(htmlContent)
  const textPreview = getTextPreview(htmlContent, maxPreviewLength)

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {hasDangerous ? (
            <>
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-yellow-700">
                Se detectaron elementos HTML que serán convertidos a texto plano
              </span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-700">
                Contenido limpio - se convertirá a texto plano estructurado
              </span>
            </>
          )}
        </div>
        
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          {showPreview ? (
            <>
              <EyeOff className="w-4 h-4" />
              <span>Ocultar vista previa</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              <span>Ver vista previa</span>
            </>
          )}
        </button>
      </div>

      {showPreview && (
        <div className="space-y-3">
          {/* Vista previa del texto limpio */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">
              Vista previa del texto:
            </h4>
            <div className="p-2 bg-white rounded border text-sm text-gray-800">
              {textPreview}
            </div>
          </div>

          {/* Vista previa del texto plano */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">
              Texto plano estructurado (para el chatbot):
            </h4>
            <div className="p-2 bg-white rounded border text-sm text-gray-800 max-h-32 overflow-y-auto">
              <pre className="whitespace-pre-wrap break-words">
                {cleanedText}
              </pre>
            </div>
          </div>

          {/* Información sobre elementos eliminados */}
          {hasDangerous && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <p className="text-yellow-800">
                <strong>Nota:</strong> El HTML se convertirá automáticamente a texto plano estructurado. 
                Se eliminarán estilos, enlaces, elementos de navegación (tabs), IDs y otros elementos 
                HTML, manteniendo solo el contenido de texto organizado con formato markdown básico 
                (títulos, listas, tablas como texto) para optimizar el rendimiento del chatbot.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default HtmlPreview
