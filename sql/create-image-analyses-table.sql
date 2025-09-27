-- Crear tabla para almacenar análisis de imágenes
CREATE TABLE IF NOT EXISTS image_analyses (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  source TEXT DEFAULT 'api',
  product_name TEXT,
  product_description TEXT,
  confidence DECIMAL(3,2),
  web_results_count INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_image_analyses_user_id ON image_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_image_analyses_created_at ON image_analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_image_analyses_product_name ON image_analyses(product_name);

-- Comentarios en la tabla
COMMENT ON TABLE image_analyses IS 'Almacena análisis de imágenes realizados por DeepSeek Vision';
COMMENT ON COLUMN image_analyses.user_id IS 'ID del usuario que subió la imagen';
COMMENT ON COLUMN image_analyses.source IS 'Fuente de la imagen (api, chat, whatsapp, etc.)';
COMMENT ON COLUMN image_analyses.product_name IS 'Nombre del producto identificado en la imagen';
COMMENT ON COLUMN image_analyses.product_description IS 'Descripción del producto identificado';
COMMENT ON COLUMN image_analyses.confidence IS 'Nivel de confianza del análisis (0.0 - 1.0)';
COMMENT ON COLUMN image_analyses.web_results_count IS 'Número de resultados encontrados en búsqueda web';
COMMENT ON COLUMN image_analyses.processing_time_ms IS 'Tiempo de procesamiento en milisegundos';
