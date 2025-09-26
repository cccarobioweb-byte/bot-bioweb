# 📱 Integración WhatsApp con ManyChat

Esta guía te explica cómo integrar tu chatbot con WhatsApp usando ManyChat.

## 🚀 Configuración en Supabase

### 1. Desplegar la Edge Function

La función `manychat-webhook` ya está creada. Necesitas desplegarla en Supabase:

```bash
# Desde la terminal, en la carpeta del proyecto
supabase functions deploy manychat-webhook
```

### 2. Obtener la URL del Webhook

Una vez desplegada, tu webhook estará disponible en:
```
https://tu-proyecto.supabase.co/functions/v1/manychat-webhook
```

## 🔧 Configuración en ManyChat

### 1. Crear la Acción de Webhook

1. **Ve a ManyChat Dashboard**
2. **Selecciona tu bot**
3. **Ve a "Acciones" → "Solicitud externa"**
4. **Configura la solicitud:**

#### **Configuración Básica:**
- **Tipo de solicitud:** `POST`
- **URL:** `https://tu-proyecto.supabase.co/functions/v1/manychat-webhook`
- **Contacto para pruebas:** Tu nombre

#### **Encabezados:**
```
Content-Type: application/json
Authorization: Bearer tu_supabase_anon_key
```

#### **Cuerpo (JSON):**
```json
{
  "message": "{{user_message}}",
  "user_id": "{{user_id}}",
  "first_name": "{{first_name}}",
  "phone_number": "{{phone_number}}"
}
```

### 2. Configurar el Mapeo de Respuesta

En la sección **"Mapeo de respuesta"**, mapea:
- **Campo de respuesta:** `response`
- **Variable de ManyChat:** `bot_response`

### 3. Conectar con el Flujo de Chat

1. **Crea un nodo de "Solicitud externa"** en tu flujo
2. **Selecciona la acción** que creaste
3. **Configura la respuesta** para enviar `{{bot_response}}` al usuario

## 📋 Variables Disponibles en ManyChat

### **Variables de Entrada (que envías al webhook):**
- `{{user_message}}` - El mensaje del usuario
- `{{user_id}}` - ID único del usuario
- `{{first_name}}` - Nombre del usuario
- `{{phone_number}}` - Número de teléfono

### **Variables de Salida (que recibes del webhook):**
- `{{bot_response}}` - Respuesta del chatbot
- `{{success}}` - Estado de la operación (true/false)

## 🧪 Pruebas

### 1. Probar el Webhook Directamente

Puedes probar el webhook con curl:

```bash
curl -X POST https://tu-proyecto.supabase.co/functions/v1/manychat-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer tu_supabase_anon_key" \
  -d '{
    "message": "Hola, necesito una estación meteorológica",
    "user_id": "test_user_123",
    "first_name": "Usuario de Prueba",
    "phone_number": "+1234567890"
  }'
```

### 2. Probar en ManyChat

1. **Usa el "Contacto para pruebas"** que configuraste
2. **Envía un mensaje** como "Hola, necesito ayuda con productos"
3. **Verifica** que recibas una respuesta del chatbot

## 🔄 Flujo Completo

```
Usuario WhatsApp → ManyChat → Tu Webhook → Supabase Chat → IA → Respuesta → ManyChat → Usuario WhatsApp
```

## ⚠️ Consideraciones Importantes

### **Límites de ManyChat:**
- **Timeout:** 30 segundos máximo
- **Tamaño de respuesta:** Máximo 2000 caracteres
- **Rate limiting:** Depende de tu plan

### **Optimizaciones:**
- **Respuestas cortas:** El chatbot está optimizado para WhatsApp
- **Sin historial:** Cada mensaje es independiente
- **Identificación de usuario:** Se mantiene por `user_id`

## 🛠️ Solución de Problemas

### **Error 401 (Unauthorized):**
- Verifica que el `Authorization` header tenga la clave correcta
- Asegúrate de usar `SUPABASE_ANON_KEY`, no `SERVICE_ROLE_KEY`

### **Error 500 (Internal Server Error):**
- Revisa los logs en Supabase Dashboard
- Verifica que la función `chat` esté desplegada

### **Timeout en ManyChat:**
- Reduce la complejidad de las consultas
- Optimiza las respuestas del chatbot

### **Respuesta vacía:**
- Verifica el mapeo de respuesta en ManyChat
- Asegúrate de que el campo `response` esté mapeado correctamente

## 📞 Soporte

Si tienes problemas:
1. **Revisa los logs** en Supabase Dashboard
2. **Prueba el webhook** directamente con curl
3. **Verifica la configuración** en ManyChat

## 🎉 ¡Listo!

Una vez configurado, tu chatbot funcionará en WhatsApp a través de ManyChat, manteniendo toda la funcionalidad del chat web pero adaptado para mensajería.
