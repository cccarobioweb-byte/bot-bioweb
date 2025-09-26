#!/bin/bash

# Script para desplegar la integración de ManyChat
echo "🚀 Desplegando integración ManyChat..."

# Verificar que Supabase CLI esté instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI no está instalado"
    echo "Instálalo con: npm install -g supabase"
    exit 1
fi

# Verificar que estemos en el directorio correcto
if [ ! -f "supabase/functions/manychat-webhook/index.ts" ]; then
    echo "❌ No se encontró la función manychat-webhook"
    echo "Asegúrate de estar en el directorio raíz del proyecto"
    exit 1
fi

# Desplegar la función
echo "📦 Desplegando función manychat-webhook..."
supabase functions deploy manychat-webhook

if [ $? -eq 0 ]; then
    echo "✅ Función desplegada exitosamente"
    echo ""
    echo "🔗 Tu webhook está disponible en:"
    echo "https://$(supabase status | grep 'API URL' | awk '{print $3}')/functions/v1/manychat-webhook"
    echo ""
    echo "📋 Próximos pasos:"
    echo "1. Copia la URL del webhook"
    echo "2. Configura ManyChat con esa URL"
    echo "3. Sigue la guía en MANYCHAT-INTEGRATION.md"
else
    echo "❌ Error al desplegar la función"
    exit 1
fi
