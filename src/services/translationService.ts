/**
 * Servicio de traducción automática
 * Detecta idioma y traduce al español cuando sea necesario
 */
import { getTranslationCache, setTranslationCache } from './cacheService'

interface TranslationResponse {
  translatedText: string
  detectedLanguage: string
  isTranslated: boolean
}

/**
 * Detecta si un texto está en inglés
 */
const isEnglishText = (text: string): boolean => {
  if (!text || text.trim().length === 0) return false
  
  // Palabras comunes en inglés que indican que el texto está en inglés
  const englishIndicators = [
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'can', 'cannot', 'this', 'that', 'these', 'those', 'a', 'an', 'as', 'if',
    'when', 'where', 'why', 'how', 'what', 'which', 'who', 'whom', 'whose',
    'weather', 'station', 'sensor', 'data', 'monitoring', 'environmental',
    'temperature', 'humidity', 'pressure', 'wind', 'precipitation', 'solar',
    'radiation', 'measurement', 'accuracy', 'precision', 'range', 'operating',
    'conditions', 'specifications', 'features', 'characteristics', 'performance',
    'reliability', 'durability', 'installation', 'maintenance', 'calibration',
    'software', 'hardware', 'interface', 'communication', 'wireless', 'battery',
    'power', 'voltage', 'current', 'resistance', 'frequency', 'signal', 'noise',
    'interference', 'protection', 'safety', 'certification', 'compliance',
    'standard', 'protocol', 'network', 'connection', 'transmission', 'reception'
  ]
  
  const words = text.toLowerCase().split(/\s+/)
  const englishWordCount = words.filter(word => 
    englishIndicators.includes(word.replace(/[^\w]/g, ''))
  ).length
  
  // Si más del 30% de las palabras son indicadores de inglés, consideramos que está en inglés
  const englishRatio = englishWordCount / words.length
  return englishRatio > 0.3
}

/**
 * Traduce texto de inglés a español usando DeepSeek
 */
const translateWithDeepSeek = async (text: string): Promise<string> => {
  // Usar la misma variable que ya tienes configurada
  const deepseekApiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
  
  if (!deepseekApiKey) {
    console.warn('VITE_DEEPSEEK_API_KEY no configurada, no se puede traducir')
    return text
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `Eres un traductor técnico especializado en equipos meteorológicos y sensores ambientales. 
            Traduce el siguiente texto técnico del inglés al español, manteniendo:
            - Términos técnicos precisos
            - Especificaciones numéricas exactas
            - Unidades de medida correctas
            - Formato y estructura original
            - Nombres de productos y marcas
            
            Responde SOLO con la traducción, sin explicaciones adicionales.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      throw new Error(`Error en traducción: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || text
  } catch (error) {
    console.error('Error traduciendo con DeepSeek:', error)
    return text
  }
}

/**
 * Traduce texto si está en inglés (con caché)
 */
export const translateIfNeeded = async (text: string): Promise<TranslationResponse> => {
  if (!text || text.trim().length === 0) {
    return {
      translatedText: text,
      detectedLanguage: 'unknown',
      isTranslated: false
    }
  }

  const isEnglish = isEnglishText(text)
  
  if (!isEnglish) {
    return {
      translatedText: text,
      detectedLanguage: 'spanish',
      isTranslated: false
    }
  }

  // Verificar caché de traducción
  const cachedTranslation = getTranslationCache(text)
  if (cachedTranslation) {
    return {
      translatedText: cachedTranslation,
      detectedLanguage: 'english',
      isTranslated: true
    }
  }

  try {
    const translatedText = await translateWithDeepSeek(text)
    
    // Guardar en caché
    setTranslationCache(text, translatedText)
    
    return {
      translatedText,
      detectedLanguage: 'english',
      isTranslated: true
    }
  } catch (error) {
    console.error('Error en traducción:', error)
    return {
      translatedText: text,
      detectedLanguage: 'english',
      isTranslated: false
    }
  }
}

/**
 * Traduce múltiples textos en paralelo
 */
export const translateMultiple = async (texts: string[]): Promise<TranslationResponse[]> => {
  const promises = texts.map(text => translateIfNeeded(text))
  return Promise.all(promises)
}

/**
 * Traduce un producto completo
 */
export const translateProduct = async (product: {
  name: string
  description: string
  collection: string
}): Promise<{
  name: string
  description: string
  collection: string
  translations: {
    name: TranslationResponse
    description: TranslationResponse
    collection: TranslationResponse
  }
}> => {
  const [nameTranslation, descriptionTranslation, collectionTranslation] = await translateMultiple([
    product.name,
    product.description,
    product.collection
  ])

  return {
    name: nameTranslation.translatedText,
    description: descriptionTranslation.translatedText,
    collection: collectionTranslation.translatedText,
    translations: {
      name: nameTranslation,
      description: descriptionTranslation,
      collection: collectionTranslation
    }
  }
}
