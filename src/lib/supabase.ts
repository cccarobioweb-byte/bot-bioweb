// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// Solo crear el cliente si las variables están configuradas correctamente
export const supabase = supabaseUrl !== 'https://placeholder.supabase.co' && supabaseKey !== 'placeholder-key'
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Tipos para TypeScript
export interface Product {
  id: number
  name: string
  description: string
  categoria: string
  type: 'equipo' | 'accesorio' | 'suministro'
  tags?: string[]
  marca?: string
  modelo?: string
  titulo?: string
  articulos_requeridos?: any[]
  articulos_opcionales?: any[]
  caracteristicas?: any[]
  especificaciones?: any
  product_data?: any
  created_at: string
  updated_at: string
  relevance?: number // Para ranking de búsqueda
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  translationInfo?: {
    wasTranslated: boolean
    detectedLanguage: string
  }
}

export interface ChatSession {
  id: string
  messages: ChatMessage[]
  created_at: Date
}