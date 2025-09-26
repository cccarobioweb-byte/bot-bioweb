-- Migración para agregar soporte JSON a la tabla brand_info existente

-- 1. Agregar la columna json_data si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'brand_info' AND column_name = 'json_data') THEN
        ALTER TABLE brand_info ADD COLUMN json_data JSONB;
    END IF;
END $$;

-- 2. Hacer el campo content opcional (si no lo es ya)
DO $$ 
BEGIN
    -- Verificar si content es NOT NULL y cambiarlo a NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'brand_info' 
               AND column_name = 'content' 
               AND is_nullable = 'NO') THEN
        ALTER TABLE brand_info ALTER COLUMN content DROP NOT NULL;
    END IF;
END $$;

-- 3. Crear índices para JSON (si no existen)
CREATE INDEX IF NOT EXISTS idx_brand_info_json_gin ON brand_info USING GIN(json_data);
CREATE INDEX IF NOT EXISTS idx_brand_info_json_stations ON brand_info USING GIN((json_data->'stations'));

-- 4. Actualizar el índice de texto completo para que no dependa solo de content
DROP INDEX IF EXISTS idx_brand_info_content_fts;
CREATE INDEX IF NOT EXISTS idx_brand_info_title_fts ON brand_info USING GIN(to_tsvector('spanish', title || ' ' || brand_name));

-- 5. Verificar la estructura final
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'brand_info' 
ORDER BY ordinal_position;
