# Script para desplegar la integración de ManyChat en PowerShell
Write-Host "🚀 Desplegando integración ManyChat..." -ForegroundColor Green

# Verificar que Supabase CLI esté instalado
try {
    $supabaseVersion = supabase --version
    Write-Host "✅ Supabase CLI encontrado: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI no está instalado" -ForegroundColor Red
    Write-Host "Instálalo con: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Verificar que estemos en el directorio correcto
if (-not (Test-Path "supabase/functions/manychat-webhook/index.ts")) {
    Write-Host "❌ No se encontró la función manychat-webhook" -ForegroundColor Red
    Write-Host "Asegúrate de estar en el directorio raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

# Desplegar la función
Write-Host "📦 Desplegando función manychat-webhook..." -ForegroundColor Blue
supabase functions deploy manychat-webhook

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Función desplegada exitosamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 Tu webhook está disponible en:" -ForegroundColor Cyan
    Write-Host "https://tu-proyecto.supabase.co/functions/v1/manychat-webhook" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
    Write-Host "1. Copia la URL del webhook" -ForegroundColor White
    Write-Host "2. Configura ManyChat con esa URL" -ForegroundColor White
    Write-Host "3. Sigue la guía en MANYCHAT-INTEGRATION.md" -ForegroundColor White
} else {
    Write-Host "❌ Error al desplegar la función" -ForegroundColor Red
    exit 1
}
