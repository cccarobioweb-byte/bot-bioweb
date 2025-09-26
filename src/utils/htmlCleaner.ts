// Función de limpieza HTML personalizada - No requiere librerías externas

/**
 * Configuración personalizada para limpiar HTML de descripciones de productos
 */
const CLEANER_CONFIG = {
  // Elementos permitidos (contenido de texto y estructura básica)
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'span', 'div',
    'table', 'thead', 'tbody', 'tr', 'th', 'td' // Tablas para especificaciones
  ],
  
  // Atributos permitidos (solo los necesarios)
  ALLOWED_ATTR: ['class'],
  
  // Elementos que se eliminarán completamente (no necesarios para descripciones)
  FORBID_TAGS: [
    'script', 'style', 'video', 'audio', 'img', 'iframe', 'object', 'embed',
    'form', 'input', 'button', 'select', 'textarea', 'link', 'meta',
    'canvas', 'svg', 'math', 'applet', 'frame', 'frameset',
    'a' // Enlaces (href, target, rel)
  ],
  
  // Atributos que se eliminarán (estilos y enlaces)
  FORBID_ATTR: [
    'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
    'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset',
    'src', 'href', 'action', 'method', 'target', 'rel',
    'style', 'id' // Estilos inline e IDs
  ]
}

/**
 * Convierte HTML a texto plano estructurado para el chatbot
 */
const convertHTMLToStructuredText = (html: string): string => {
  let text = html

  // Remover SOLO elementos de navegación (tabs), NO el contenido
  text = text.replace(/<ul[^>]*class\s*=\s*["']tabs["'][^>]*>.*?<\/ul>/gis, '')
  
  // NO eliminar tabs-content - contiene las tablas importantes
  // En su lugar, solo remover las etiquetas ul pero mantener el contenido
  text = text.replace(/<ul[^>]*class\s*=\s*["']tabs-content["'][^>]*>/gi, '')
  // Solo remover el cierre de ul si no está dentro de tabs-content
  text = text.replace(/<\/ul>(?!\s*$)/gi, '')

  // Remover elementos no necesarios
  CLEANER_CONFIG.FORBID_TAGS.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis')
    text = text.replace(regex, '')
    
    const selfClosingRegex = new RegExp(`<${tag}[^>]*/?>`, 'gi')
    text = text.replace(selfClosingRegex, '')
  })

  // Remover enlaces pero mantener el texto
  text = text.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')

  // Convertir elementos de estructura a texto plano
  text = text
    // Títulos principales
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n$1\n' + '='.repeat(50) + '\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n$1\n' + '-'.repeat(30) + '\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n$1:\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n$1:\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n$1:\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n$1:\n')
    
    // Párrafos
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
    
    // Listas (convertir a texto estructurado)
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, (match, content) => {
      // Si el contenido contiene tablas, no agregar bullet point
      if (content.includes('<table')) {
        return content + '\n'
      }
      return '• ' + content + '\n'
    })
    
    // Tablas (convertir a formato de texto estructurado - PRESERVAR TODA LA INFORMACIÓN)
    .replace(/<table[^>]*>/gi, '\n\n--- ESPECIFICACIONES ---\n')
    .replace(/<\/table>/gi, '\n--- FIN ESPECIFICACIONES ---\n\n')
    .replace(/<thead[^>]*>/gi, '')
    .replace(/<\/thead>/gi, '')
    .replace(/<tbody[^>]*>/gi, '')
    .replace(/<\/tbody>/gi, '')
    .replace(/<tr[^>]*>/gi, '')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<th[^>]*>(.*?)<\/th>/gi, '$1 | ')
    .replace(/<td[^>]*>(.*?)<\/td>/gi, '$1 | ')
    
    // Formato de texto
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '$1')
    
    // Saltos de línea y espacios
    .replace(/<br[^>]*\/?>/gi, '\n')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<span[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '\n"$1"\n')

  // Limpiar texto resultante
  return cleanStructuredText(text)
}

/**
 * Limpia el texto estructurado resultante
 */
const cleanStructuredText = (text: string): string => {
  return text
    // Decodificar entidades HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    
    // Limpiar elementos HTML residuales
    .replace(/<\/li>/g, '') // Etiquetas de cierre de lista
    .replace(/<li[^>]*>/g, '') // Etiquetas de apertura de lista
    .replace(/<strong>/g, '') // Etiquetas strong residuales
    .replace(/<\/strong>/g, '') // Etiquetas strong de cierre
    .replace(/<span[^>]*>/g, '') // Etiquetas span residuales
    .replace(/<\/span>/g, '') // Etiquetas span de cierre
    .replace(/<br[^>]*\/?>/g, '\n') // Saltos de línea residuales
    
    // Limpiar formato markdown anidado
    .replace(/\*\*<strong>/g, '**') // **<strong> -> **
    .replace(/<\/strong>\*\*/g, '**') // </strong>** -> **
    .replace(/\*<em>/g, '*') // *<em> -> *
    .replace(/<\/em>\*/g, '*') // </em>* -> *
    
    // Limpiar listas vacías y elementos residuales
    .replace(/•\s*$/gm, '') // Bullet points vacíos al final de línea
    .replace(/•\s*\n\s*•/g, '•') // Múltiples bullet points consecutivos
    .replace(/^\s*•\s*$/gm, '') // Líneas que solo contienen bullet points
    
    // Limpiar espacios y saltos de línea
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Máximo 2 saltos de línea consecutivos
    .replace(/[ \t]+/g, ' ') // Múltiples espacios a uno solo
    .replace(/\n /g, '\n') // Espacios al inicio de línea
    .replace(/ \n/g, '\n') // Espacios al final de línea
    .replace(/^\s+|\s+$/g, '') // Espacios al inicio y final
    
    // Limpiar separadores de tabla (PRESERVAR ESTRUCTURA)
    .replace(/\|\s*$/gm, '') // Pipes al final de línea
    .replace(/^\s*\|\s*/gm, '') // Pipes al inicio de línea
    .replace(/\s*\|\s*/g, ' | ') // Espacios alrededor de pipes
    .replace(/\|\s*\n/g, '\n') // Pipes seguidos de salto de línea
    
    // Limpiar líneas vacías al final
    .replace(/\n+$/, '')
}

/**
 * Convierte HTML a texto plano limpio y bien estructurado para el chatbot
 * @param htmlContent - Contenido HTML a convertir
 * @returns Texto plano estructurado sin HTML
 */
export const cleanProductDescription = (htmlContent: string): string => {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return ''
  }

  try {
    // Convertir HTML a texto plano estructurado
    return convertHTMLToStructuredText(htmlContent)
    
  } catch (error) {
    console.error('Error converting HTML to text:', error)
    // En caso de error, retornar solo texto plano básico
    return stripAllHTML(htmlContent)
  }
}

/**
 * Post-procesamiento adicional para limpiar elementos residuales
 */
const postProcessCleanedHTML = (html: string): string => {
  return html
    // Remover elementos de navegación/tabs que no son necesarios
    .replace(/<ul[^>]*class\s*=\s*["']tabs["'][^>]*>.*?<\/ul>/gs, '')
    .replace(/<ul[^>]*class\s*=\s*["']tabs-content["'][^>]*>.*?<\/ul>/gs, '')
    
    // Remover enlaces pero mantener el texto
    .replace(/<a[^>]*>(.*?)<\/a>/g, '$1')
    
    // Remover etiquetas vacías
    .replace(/<(\w+)[^>]*>\s*<\/\1>/g, '')
    
    // Remover atributos de estilo e ID
    .replace(/\s*style\s*=\s*["'][^"']*["']/g, '')
    .replace(/\s*id\s*=\s*["'][^"']*["']/g, '')
    .replace(/\s*class\s*=\s*["']active["']/g, '')
    
    // Limpiar clases vacías
    .replace(/\s*class\s*=\s*["'][^"']*["']/g, '')
    
    // Remover múltiples espacios en blanco
    .replace(/\s+/g, ' ')
    
    // Remover saltos de línea múltiples
    .replace(/\n\s*\n/g, '\n')
    
    // Remover espacios al inicio y final
    .trim()
    
    // Limpiar elementos de lista que quedaron vacíos
    .replace(/<li>\s*<\/li>/g, '')
    .replace(/<ul>\s*<\/ul>/g, '')
    .replace(/<ol>\s*<\/ol>/g, '')
}

/**
 * Función de respaldo para extraer solo texto plano
 */
const stripAllHTML = (html: string): string => {
  return html
    // Remover todas las etiquetas HTML
    .replace(/<[^>]*>/g, '')
    // Decodificar entidades HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Limpiar espacios
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Función para obtener una vista previa del texto limpio (sin HTML)
 */
export const getTextPreview = (htmlContent: string, maxLength: number = 150): string => {
  const cleanedText = stripAllHTML(htmlContent)
  return cleanedText.length > maxLength 
    ? cleanedText.substring(0, maxLength) + '...'
    : cleanedText
}

/**
 * Función para validar si el HTML contiene elementos que serán limpiados
 * (estilos, enlaces, navegación, etc.)
 */
export const hasDangerousContent = (htmlContent: string): boolean => {
  if (!htmlContent) return false
  
  const cleanupPatterns = [
    /<script[^>]*>/i,
    /<style[^>]*>/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i,
    /<form[^>]*>/i,
    /<img[^>]*>/i,
    /<video[^>]*>/i,
    /<audio[^>]*>/i,
    /<a[^>]*href[^>]*>/i, // Enlaces
    /style\s*=\s*["'][^"']*["']/i, // Estilos inline
    /id\s*=\s*["'][^"']*["']/i, // IDs
    /class\s*=\s*["']tabs["']/i, // Elementos de navegación
    /class\s*=\s*["']tabs-content["']/i,
    /on\w+\s*=/i, // Eventos JavaScript
    /javascript:/i,
    /vbscript:/i
  ]
  
  return cleanupPatterns.some(pattern => pattern.test(htmlContent))
}

// Función de prueba para verificar conversión de tablas
export const testTableConversion = (htmlContent: string): string => {
  if (!htmlContent) return ''
  
  console.log('=== PRUEBA DE CONVERSIÓN DE TABLAS ===')
  console.log('HTML Original:', htmlContent.substring(0, 500) + '...')
  
  const converted = convertHTMLToStructuredText(htmlContent)
  console.log('Texto Convertido:', converted.substring(0, 1000) + '...')
  
  return converted
}
