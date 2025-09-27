-- Schema para sistema de embeddings semánticos con pgvector
-- Este archivo crea las tablas necesarias para búsqueda semántica

-- 1. Habilitar la extensión pgvector (ejecutar en Supabase SQL Editor)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabla para embeddings de productos
CREATE TABLE IF NOT EXISTS product_embeddings (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  content TEXT NOT NULL, -- Texto que se convirtió en embedding
  embedding VECTOR(1536), -- Embedding de OpenAI/DeepSeek (1536 dimensiones)
  content_type VARCHAR(50) DEFAULT 'product', -- 'product', 'description', 'category'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices únicos para evitar duplicados
  UNIQUE(product_id, content_type)
);

-- 3. Tabla para embeddings de información de marcas
CREATE TABLE IF NOT EXISTS brand_embeddings (
  id BIGSERIAL PRIMARY KEY,
  brand_info_id INTEGER NOT NULL REFERENCES brand_info(id) ON DELETE CASCADE,
  content TEXT NOT NULL, -- Texto que se convirtió en embedding
  embedding VECTOR(1536), -- Embedding de OpenAI/DeepSeek
  content_type VARCHAR(50) DEFAULT 'brand', -- 'brand', 'title', 'content', 'json_data'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices únicos para evitar duplicados
  UNIQUE(brand_info_id, content_type)
);

-- 4. Tabla para embeddings de consultas de usuarios (para mejorar búsquedas)
CREATE TABLE IF NOT EXISTS query_embeddings (
  id BIGSERIAL PRIMARY KEY,
  query_text TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  user_id VARCHAR(100),
  source VARCHAR(50) DEFAULT 'web', -- 'web', 'whatsapp', 'api'
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índice para búsquedas por texto
  UNIQUE(query_text, user_id, source)
);

-- 5. Tabla para caché de búsquedas semánticas
CREATE TABLE IF NOT EXISTS semantic_search_cache (
  id BIGSERIAL PRIMARY KEY,
  query_hash VARCHAR(64) NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  query_embedding VECTOR(1536) NOT NULL,
  results JSONB NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 0,
  similarity_threshold REAL DEFAULT 0.7,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
  access_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Índices para optimizar búsquedas vectoriales
-- Índice HNSW para búsquedas de similitud rápida en productos
CREATE INDEX IF NOT EXISTS idx_product_embeddings_hnsw 
ON product_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Índice HNSW para búsquedas de similitud rápida en marcas
CREATE INDEX IF NOT EXISTS idx_brand_embeddings_hnsw 
ON brand_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Índice HNSW para búsquedas de similitud en consultas
CREATE INDEX IF NOT EXISTS idx_query_embeddings_hnsw 
ON query_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Índice HNSW para caché de búsquedas semánticas
CREATE INDEX IF NOT EXISTS idx_semantic_cache_hnsw 
ON semantic_search_cache USING hnsw (query_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 7. Índices adicionales para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_product_embeddings_product_id ON product_embeddings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_embeddings_content_type ON product_embeddings(content_type);
CREATE INDEX IF NOT EXISTS idx_brand_embeddings_brand_id ON brand_embeddings(brand_info_id);
CREATE INDEX IF NOT EXISTS idx_brand_embeddings_content_type ON brand_embeddings(content_type);
CREATE INDEX IF NOT EXISTS idx_query_embeddings_user_id ON query_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_query_embeddings_source ON query_embeddings(source);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_expires ON semantic_search_cache(expires_at);

-- 8. Función para limpiar caché expirado
CREATE OR REPLACE FUNCTION cleanup_expired_semantic_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM semantic_search_cache 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 9. Función para obtener productos similares por embedding
CREATE OR REPLACE FUNCTION find_similar_products(
  query_embedding VECTOR(1536),
  similarity_threshold REAL DEFAULT 0.7,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_id BIGINT,
  similarity DOUBLE PRECISION,
  content TEXT,
  content_type VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pe.product_id,
    1 - (pe.embedding <=> query_embedding) AS similarity,
    pe.content,
    pe.content_type
  FROM product_embeddings pe
  WHERE 1 - (pe.embedding <=> query_embedding) > similarity_threshold
  ORDER BY pe.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 10. Función para obtener información de marcas similar por embedding
CREATE OR REPLACE FUNCTION find_similar_brands(
  query_embedding VECTOR(1536),
  similarity_threshold REAL DEFAULT 0.7,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  brand_info_id INTEGER,
  similarity DOUBLE PRECISION,
  content TEXT,
  content_type VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    be.brand_info_id,
    1 - (be.embedding <=> query_embedding) AS similarity,
    be.content,
    be.content_type
  FROM brand_embeddings be
  WHERE 1 - (be.embedding <=> query_embedding) > similarity_threshold
  ORDER BY be.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 11. Comentarios para documentación
COMMENT ON TABLE product_embeddings IS 'Embeddings vectoriales de productos para búsqueda semántica';
COMMENT ON TABLE brand_embeddings IS 'Embeddings vectoriales de información de marcas para búsqueda semántica';
COMMENT ON TABLE query_embeddings IS 'Embeddings de consultas de usuarios para análisis y mejora';
COMMENT ON TABLE semantic_search_cache IS 'Caché de búsquedas semánticas para optimizar rendimiento';
COMMENT ON FUNCTION find_similar_products IS 'Encuentra productos similares usando similitud coseno';
COMMENT ON FUNCTION find_similar_brands IS 'Encuentra información de marcas similar usando similitud coseno';
