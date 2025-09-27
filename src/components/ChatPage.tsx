import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, RotateCcw, Camera } from 'lucide-react'
import { useChat } from '../hooks/useChat'
import MarkdownText from './MarkdownText'
import TranslationIndicator from './TranslationIndicator'
import ImageUpload from './ImageUpload'
import { ChatService } from '../services/chatService'

const ChatPage: React.FC = () => {
  const { messages, isLoading, error, sendMessage, clearChat } = useChat()
  const [inputValue, setInputValue] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      sendMessage(inputValue.trim())
      setInputValue('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const handleSendClick = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue.trim())
      setInputValue('')
    }
  }

  const handleImageSelect = async (file: File) => {
    setSelectedImage(file)
    setIsProcessingImage(true)

    try {
      // Procesar la imagen internamente
      const result = await ChatService.processImage(file)
      
      if (result.success) {
        // Crear mensaje interno para el chatbot basado en el escenario
        let internalMessage = ''
        
        switch (result.scenario) {
          case 'exact_match':
            // Producto encontrado exactamente
            internalMessage = `He identificado este producto en la imagen: ${result.productName}. ` +
              `Tenemos exactamente este producto en nuestro catálogo: ${result.product.name} (${result.product.categoria || 'N/A'}). ` +
              `Descripción: ${result.product.description || 'Sin descripción'}. ` +
              `Proporciona información detallada sobre este producto específico.`
            break
            
          case 'similar_products':
            // Producto no encontrado pero hay similares
            const similarNames = result.similarProducts?.map(p => p.name).join(', ') || ''
            internalMessage = `He identificado este producto en la imagen: ${result.productName}. ` +
              `No tenemos exactamente este producto, pero tenemos productos similares: ${similarNames}. ` +
              `Explica que no tenemos el producto específico pero presenta las alternativas similares disponibles.`
            break
            
          case 'no_match':
            // Producto no encontrado ni similares
            internalMessage = `He identificado este producto en la imagen: ${result.productName}. ` +
              `No tenemos este producto ni productos similares en nuestro catálogo actual. ` +
              `Explica brevemente por qué no está disponible y sugiere que el usuario puede hacer otras consultas. ` +
              `NO listes todas las categorías disponibles, solo menciona que tenemos otros productos. ` +
              `Mantén la respuesta concisa pero completa.`
            break
            
          case 'recognition_failed':
            // No se pudo reconocer la imagen
            internalMessage = `No pude reconocer claramente el producto en la imagen enviada. ` +
              `Explica que no pudo identificar el producto y sugiere que el usuario intente con una imagen más clara o describa el producto.`
            break
            
          default:
            internalMessage = `He identificado este producto en la imagen: ${result.productName}. ` +
              `Proporciona información sobre este producto.`
        }
        
        // Enviar mensaje interno al chatbot (no visible al usuario)
        // Usar sendMessage directamente sin mostrar el mensaje interno
        sendMessage(internalMessage, true) // true = mensaje interno
      } else {
        // Error en el procesamiento
        const message = `No pude identificar claramente el producto en la imagen. ` +
          `Por favor, intenta con una imagen más clara o describe el producto que buscas.`
        
        sendMessage(message)
      }
    } catch (error) {
      console.error('Error procesando imagen:', error)
      const message = `Ocurrió un error al procesar la imagen. Por favor, intenta de nuevo.`
      sendMessage(message)
    } finally {
      setIsProcessingImage(false)
      setSelectedImage(null)
    }
  }

  const handleImageRemove = () => {
    setSelectedImage(null)
    setImageError(null)
  }

  const handleImageError = (error: string) => {
    setImageError(error)
    // Mostrar el error como mensaje en el chat
    sendMessage(`❌ Error al cargar imagen: ${error}`)
  }

  return (
    <div className="h-full flex bg-gray-50">
      {/* Sidebar para pantallas grandes */}
      <div className="hidden lg:block w-64 bg-white shadow-sm border-r flex-shrink-0">
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Consultor de Productos
              </h1>
              <p className="text-sm text-gray-500">
                Especialista en equipos técnicos
              </p>
            </div>
          </div>
          
          <button
            onClick={clearChat}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium shadow-sm"
            title="Limpiar chat"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Nuevo Chat</span>
          </button>
        </div>
      </div>

      {/* Contenido principal del chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header compacto para móviles */}
        <div className="lg:hidden bg-white shadow-sm border-b p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900">
                Consultor de Productos
              </h1>
              <p className="text-xs text-gray-500">
                Especialista en equipos técnicos
              </p>
            </div>
          </div>
          
          <button
            onClick={clearChat}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Limpiar chat"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Chat</span>
          </button>
        </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-2 max-w-[80%] ${
              message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user' 
                  ? 'bg-blue-500' 
                  : 'bg-gray-200'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-gray-600" />
                )}
              </div>
              
              {/* Message Bubble */}
              <div className={`rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}>
                {/* Translation Indicator */}
                {message.translationInfo && (
                  <TranslationIndicator 
                    wasTranslated={message.translationInfo.wasTranslated}
                    detectedLanguage={message.translationInfo.detectedLanguage}
                  />
                )}
                
                {message.role === 'assistant' ? (
                  <MarkdownText content={message.content} />
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                )}
                
                <div className={`text-xs mt-1 opacity-70 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2 max-w-[80%]">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-gray-600" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mx-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4 flex-shrink-0">
        <div className="flex space-x-3">
          {/* Botón de carga de imagen */}
          <div className="flex-shrink-0">
            <ImageUpload
              onImageSelect={handleImageSelect}
              onImageRemove={handleImageRemove}
              selectedImage={selectedImage}
              isProcessing={isProcessingImage}
              onError={handleImageError}
              className="w-12 h-12"
            />
          </div>

          {/* Input de texto */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Pregúntame sobre cualquier producto..."
              className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder-gray-500"
              disabled={isLoading || isProcessingImage}
            />
          </div>
          
          {/* Botón de enviar */}
          <button
            type="button"
            onClick={handleSendClick}
            disabled={!inputValue.trim() || isLoading || isProcessingImage}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full p-3 transition-colors flex items-center justify-center flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2 text-center">
          Consulta especializada basada en nuestro catálogo de productos • 📷 Sube una foto para identificar productos
        </p>
      </div>
      </div>
    </div>
  )
}

export default ChatPage