import React from 'react'
import { Languages } from 'lucide-react'

interface TranslationIndicatorProps {
  wasTranslated: boolean
  detectedLanguage: string
}

const TranslationIndicator: React.FC<TranslationIndicatorProps> = ({ 
  wasTranslated, 
  detectedLanguage 
}) => {
  if (!wasTranslated) return null

  return (
    <div className="flex items-center space-x-1 text-xs text-gray-500 mb-1">
      <Languages className="w-3 h-3" />
      <span>
        Traducido automáticamente del {detectedLanguage === 'english' ? 'inglés' : detectedLanguage}
      </span>
    </div>
  )
}

export default TranslationIndicator






