// src/hooks/useChat.ts
import { useState, useCallback } from 'react'
import { type ChatMessage } from '../lib/supabase'
import { ChatService } from '../services/chatService'
import { v4 as uuidv4 } from 'uuid'

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: '¡Hola! Soy tu consultor especializado en equipos técnicos. ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre cualquier producto de nuestro catálogo.',
      timestamp: new Date()
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    // Agregar mensaje del usuario
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    try {
      // Preparar historial para el servicio
      const chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      // Obtener respuesta del bot
      const { 
        response: botResponse, 
        translationInfo
      } = await ChatService.sendMessage(content, chatHistory)
      
      // Agregar respuesta del bot
      const botMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: botResponse,
        timestamp: new Date(),
        translationInfo
      }
      
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      setError('No pude procesar tu mensaje. Por favor intenta nuevamente.')
      
      // Agregar mensaje de error
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: 'Lo siento, ocurrió un error técnico. Por favor intenta nuevamente o contacta a nuestro equipo de soporte.',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading])

  const clearChat = useCallback(() => {
    setMessages([{
      id: uuidv4(),
      role: 'assistant',
      content: '¡Hola! Soy tu consultor especializado en equipos técnicos. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date()
    }])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat
  }
}