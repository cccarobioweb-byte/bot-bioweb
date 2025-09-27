# Chat Widget para Shopify

Widget flotante de chat que se integra con tu tienda de Shopify para brindar asistencia técnica especializada.

## 🚀 Características

- **Widget flotante** similar al de WhatsApp
- **Chat en tiempo real** con IA especializada en equipos técnicos
- **Diseño responsive** que se adapta a móviles y desktop
- **Integración fácil** con Shopify
- **Personalizable** en colores, posición y comportamiento
- **Historial de chat** persistente
- **Formateo de mensajes** con markdown básico

## 📁 Archivos Incluidos

- `chat-widget.html` - HTML del widget
- `chat-widget.css` - Estilos del widget
- `chat-widget.js` - Lógica del widget
- `shopify-integration.js` - Script de integración para Shopify
- `README.md` - Esta documentación

## 🔧 Instalación en Shopify

### Opción 1: Integración Manual

1. **Subir archivos a tu servidor:**
   - Sube `chat-widget.css` y `chat-widget.js` a tu servidor
   - Asegúrate de que sean accesibles públicamente

2. **Editar theme.liquid:**
   - Ve a **Online Store** → **Themes** → **Actions** → **Edit code**
   - Abre `theme.liquid`
   - Agrega antes del `</head>`:

   ```liquid
   <!-- Chat Widget -->
   <script>
   window.CHAT_WIDGET_CONFIG = {
     apiKey: 'tu-api-key-aqui',
     apiUrl: 'https://tu-proyecto.supabase.co/functions/v1/chat'
   };
   </script>
   <script src="https://tu-dominio.com/shopify-integration.js"></script>
   ```

3. **Configurar URLs:**
   - Reemplaza `https://tu-dominio.com/` con la URL donde subiste los archivos
   - Reemplaza `tu-api-key-aqui` con tu API key de Supabase

### Opción 2: Integración con CDN

1. **Usar CDN público:**
   ```liquid
   <script>
   window.CHAT_WIDGET_CONFIG = {
     apiKey: 'tu-api-key-aqui',
     apiUrl: 'https://tu-proyecto.supabase.co/functions/v1/chat'
   };
   </script>
   <script src="https://cdn.jsdelivr.net/gh/tu-usuario/chat-widget@main/shopify-integration.js"></script>
   ```

## ⚙️ Configuración

### Configuración Básica

```javascript
window.CHAT_WIDGET_CONFIG = {
  apiKey: 'tu-api-key-aqui',
  apiUrl: 'https://tu-proyecto.supabase.co/functions/v1/chat',
  position: 'bottom-right', // bottom-right, bottom-left
  theme: 'default', // default, dark, custom
  showOnPages: ['all'], // ['all', 'home', 'product', 'collection', 'cart', 'checkout']
  hideOnPages: [], // Páginas donde no mostrar
  delay: 3000, // Delay en ms antes de mostrar
  autoOpen: false, // Abrir automáticamente
  showWelcomeMessage: true
};
```

### Configuración Avanzada

```javascript
// Personalizar colores
window.CHAT_WIDGET_CONFIG = {
  // ... configuración básica
  customColors: {
    primary: '#667eea',
    secondary: '#764ba2',
    background: '#ffffff',
    text: '#374151'
  }
};

// Mostrar solo en páginas específicas
window.CHAT_WIDGET_CONFIG = {
  // ... configuración básica
  showOnPages: ['product', 'collection'],
  hideOnPages: ['checkout', 'cart']
};

// Auto-abrir después de 5 segundos
window.CHAT_WIDGET_CONFIG = {
  // ... configuración básica
  delay: 5000,
  autoOpen: true
};
```

## 🎨 Personalización

### Colores Personalizados

```css
/* Agregar a tu CSS personalizado */
.chat-toggle {
  background: linear-gradient(135deg, #tu-color-1 0%, #tu-color-2 100%);
}

.chat-header {
  background: linear-gradient(135deg, #tu-color-1 0%, #tu-color-2 100%);
}
```

### Posición Personalizada

```javascript
// Cambiar posición
window.CHAT_WIDGET_CONFIG = {
  position: 'bottom-left' // o 'bottom-right'
};
```

## 🔌 API Endpoint

El widget se conecta a tu función de Supabase:

```
POST https://tu-proyecto.supabase.co/functions/v1/chat
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer tu-api-key
```

**Body:**
```json
{
  "message": "Consulta del usuario",
  "originalMessage": "Consulta del usuario",
  "chatHistory": [],
  "products": [],
  "brandInfo": [],
  "translationInfo": {
    "wasTranslated": false,
    "detectedLanguage": "es"
  },
  "source": "shopify"
}
```

## 🛠️ Funciones Disponibles

### JavaScript API

```javascript
// Abrir widget programáticamente
window.openChatWidget();

// Cerrar widget programáticamente
window.closeChatWidget();

// Configurar widget
window.configureChatWidget({
  position: 'bottom-left',
  autoOpen: true
});
```

### Eventos

```javascript
// Escuchar eventos del widget
document.addEventListener('chatWidgetOpen', function() {
  console.log('Widget abierto');
});

document.addEventListener('chatWidgetClose', function() {
  console.log('Widget cerrado');
});

document.addEventListener('chatWidgetMessage', function(event) {
  console.log('Mensaje enviado:', event.detail);
});
```

## 📱 Responsive Design

El widget se adapta automáticamente a diferentes tamaños de pantalla:

- **Desktop**: Widget flotante en esquina
- **Tablet**: Widget redimensionado
- **Mobile**: Widget a pantalla completa

## 🔒 Seguridad

- **API Key**: Mantén tu API key segura
- **HTTPS**: Usa siempre HTTPS en producción
- **CORS**: Configura CORS correctamente en Supabase
- **Rate Limiting**: Implementa límites de velocidad

## 🐛 Troubleshooting

### Widget no aparece
1. Verifica que los archivos CSS y JS se carguen correctamente
2. Revisa la consola del navegador por errores
3. Asegúrate de que la API key sea correcta

### Errores de API
1. Verifica que la función de Supabase esté desplegada
2. Revisa los logs de Supabase
3. Confirma que la API key tenga permisos correctos

### Problemas de estilo
1. Verifica que el CSS se cargue después de otros estilos
2. Revisa conflictos con el tema de Shopify
3. Usa `!important` si es necesario

## 📞 Soporte

Para soporte técnico:
- Revisa los logs de la consola del navegador
- Verifica los logs de Supabase
- Contacta al equipo de desarrollo

## 🔄 Actualizaciones

Para actualizar el widget:
1. Reemplaza los archivos en tu servidor
2. Limpia la caché del navegador
3. Verifica que la nueva versión funcione correctamente

## 📄 Licencia

Este widget está diseñado específicamente para tu proyecto de chatbot de productos técnicos.
