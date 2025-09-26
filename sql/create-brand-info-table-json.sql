-- Crear tabla para información de marcas con soporte JSON
CREATE TABLE brand_info (
  id SERIAL PRIMARY KEY,
  brand_name VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT, -- Opcional, ya que toda la info está en JSON
  json_data JSONB, -- Para almacenar el JSON completo
  category VARCHAR(100),
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices para optimizar búsquedas
CREATE INDEX idx_brand_info_brand_name ON brand_info(brand_name);
CREATE INDEX idx_brand_info_category ON brand_info(category);
CREATE INDEX idx_brand_info_tags ON brand_info USING GIN(tags);
CREATE INDEX idx_brand_info_active ON brand_info(is_active);

-- Crear índice de texto completo para búsquedas (en title y brand_name)
CREATE INDEX idx_brand_info_title_fts ON brand_info USING GIN(to_tsvector('spanish', title || ' ' || brand_name));

-- Crear índices para JSON
CREATE INDEX idx_brand_info_json_gin ON brand_info USING GIN(json_data);
CREATE INDEX idx_brand_info_json_stations ON brand_info USING GIN((json_data->'stations'));

-- La tabla está lista para que cargues la información desde el frontend
-- Usa el componente BrandInfoAdmin para gestionar los datos
