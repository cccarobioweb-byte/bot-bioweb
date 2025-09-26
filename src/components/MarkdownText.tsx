import React from 'react'

interface MarkdownTextProps {
  content: string
}

const MarkdownText: React.FC<MarkdownTextProps> = ({ content }) => {
  // Función para procesar markdown básico
  const processMarkdown = (text: string): string => {
    let processed = text
    
    // Primero convertir enlaces markdown [texto](url) - esto tiene prioridad
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>')
    
    // Luego convertir URLs directas que no estén ya dentro de enlaces
    // Usar una función para verificar que no esté dentro de un tag <a>
    processed = processed.replace(/(https?:\/\/[^\s<>"']+)/g, (match, url, offset) => {
      // Verificar si esta URL está dentro de un tag <a> existente
      const beforeMatch = processed.substring(0, offset)
      
      // Contar tags <a> abiertos y cerrados antes de esta posición
      const openTags = (beforeMatch.match(/<a\b[^>]*>/g) || []).length
      const closeTags = (beforeMatch.match(/<\/a>/g) || []).length
      
      // Si hay más tags abiertos que cerrados, esta URL está dentro de un enlace
      if (openTags > closeTags) {
        return match // No convertir, ya está dentro de un enlace
      }
      
      // Truncar URL larga para mostrar solo el nombre del archivo
      const urlParts = url.split('/')
      const fileName = urlParts[urlParts.length - 1] || 'Documento'
      const displayText = fileName.length > 50 ? fileName.substring(0, 50) + '...' : fileName
      
      // Convertir a enlace
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${displayText}</a>`
    })
    
    // Convertir **texto** a <strong>texto</strong>
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    
    // Convertir *texto* a <em>texto</em>
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Convertir saltos de línea a <br>
    processed = processed.replace(/\n/g, '<br>')
    
    return processed
  }

  const processedContent = processMarkdown(content)

  return (
    <div 
      className="whitespace-pre-wrap text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  )
}

export default MarkdownText

