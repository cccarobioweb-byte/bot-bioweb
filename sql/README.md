# Archivos SQL del Proyecto

Esta carpeta contiene los archivos SQL esenciales para el sistema de información de marcas.

## Archivos Disponibles

### 📁 `create-brand-info-table-json.sql`
**Propósito:** Crear la tabla `brand_info` con soporte JSON
- Define la estructura de la tabla para información de marcas
- Incluye índices optimizados para búsquedas
- **USAR ESTE ARCHIVO** si necesitas crear la tabla desde cero

### 📁 `migrate-brand-info-to-json.sql`
**Propósito:** Migrar tabla existente para agregar soporte JSON
- Agrega la columna `json_data` si no existe
- Hace el campo `content` opcional
- Crea índices para búsquedas JSON
- **USAR ESTE ARCHIVO** si ya tienes la tabla `brand_info` creada

## Cómo Usar

1. **Para crear una nueva tabla:** Ejecuta `create-brand-info-table-json.sql`
2. **Para migrar una tabla existente:** Ejecuta `migrate-brand-info-to-json.sql`

## Notas Importantes

- Los archivos están optimizados para PostgreSQL con Supabase
- La tabla `brand_info` permite almacenar información técnica detallada en formato JSON
- Los índices están optimizados para búsquedas rápidas en texto y JSON