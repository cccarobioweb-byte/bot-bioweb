import React, { useState } from 'react'
import { EmbeddingService } from '../services/embeddingService'

const EmbeddingGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState('')
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null)

  const generateProductEmbeddings = async () => {
    setIsGenerating(true)
    setProgress('Generando embeddings para productos...')
    
    try {
      const result = await EmbeddingService.generateProductEmbeddings()
      setResults(result)
      setProgress(`✅ Completado: ${result.success} exitosos, ${result.failed} fallaron`)
    } catch (error) {
      setProgress(`❌ Error: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateBrandEmbeddings = async () => {
    setIsGenerating(true)
    setProgress('Generando embeddings para marcas...')
    
    try {
      const result = await EmbeddingService.generateBrandEmbeddings()
      setResults(result)
      setProgress(`✅ Completado: ${result.success} exitosos, ${result.failed} fallaron`)
    } catch (error) {
      setProgress(`❌ Error: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const getStats = async () => {
    try {
      const stats = await EmbeddingService.getEmbeddingStats()
      setProgress(`📊 Estadísticas: ${stats.products} productos, ${stats.brands} marcas, ${stats.queries} consultas, ${stats.cache_entries} caché`)
    } catch (error) {
      setProgress(`❌ Error obteniendo estadísticas: ${error.message}`)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">🧠 Generador de Embeddings</h2>
      
      <div className="space-y-4">
        <button
          onClick={generateProductEmbeddings}
          disabled={isGenerating}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isGenerating ? 'Generando...' : 'Generar Embeddings de Productos'}
        </button>

        <button
          onClick={generateBrandEmbeddings}
          disabled={isGenerating}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isGenerating ? 'Generando...' : 'Generar Embeddings de Marcas'}
        </button>

        <button
          onClick={getStats}
          className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Ver Estadísticas
        </button>
      </div>

      {progress && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <p className="text-sm">{progress}</p>
        </div>
      )}

      {results && (
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <h3 className="font-semibold">Resultados:</h3>
          <p>✅ Exitosos: {results.success}</p>
          <p>❌ Fallaron: {results.failed}</p>
        </div>
      )}
    </div>
  )
}

export default EmbeddingGenerator
