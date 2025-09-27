// Chat Widget JavaScript
class ChatWidget {
    constructor() {
        this.isOpen = false;
        this.isLoading = false;
        this.chatHistory = [];
        this.apiUrl = window.CHAT_WIDGET_CONFIG?.apiUrl || 'https://tumrqxsqnmznlqeqwfgx.supabase.co/functions/v1/shopify-chat';
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadChatHistory();
    }

    bindEvents() {
        // Toggle chat
        const toggle = document.getElementById('chat-toggle');
        const close = document.getElementById('chat-close');
        const send = document.getElementById('chat-send');
        const input = document.getElementById('chat-input');

        toggle.addEventListener('click', () => this.toggleChat());
        close.addEventListener('click', () => this.closeChat());
        send.addEventListener('click', () => this.sendMessage());
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        input.addEventListener('input', () => {
            const sendBtn = document.getElementById('chat-send');
            sendBtn.disabled = !input.value.trim();
        });

        // Cerrar al hacer clic fuera
        document.addEventListener('click', (e) => {
            const widget = document.getElementById('chat-widget');
            if (this.isOpen && !widget.contains(e.target)) {
                this.closeChat();
            }
        });
    }

    toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }

    openChat() {
        const widget = document.getElementById('chat-widget');
        widget.classList.add('open');
        this.isOpen = true;
        
        // Focus en el input
        setTimeout(() => {
            document.getElementById('chat-input').focus();
        }, 300);
    }

    closeChat() {
        const widget = document.getElementById('chat-widget');
        widget.classList.remove('open');
        this.isOpen = false;
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message || this.isLoading) return;

        // Agregar mensaje del usuario
        this.addMessage(message, 'user');
        input.value = '';
        this.updateSendButton();

        // Mostrar loading
        this.setLoading(true);

        try {
            // Enviar mensaje al chatbot
            const response = await this.callChatAPI(message);
            
            // Agregar respuesta del bot
            this.addMessage(response, 'bot');
            
        } catch (error) {
            console.error('Error en chat:', error);
            this.addMessage('Lo siento, ocurrió un error. Por favor, intenta nuevamente.', 'bot');
        } finally {
            this.setLoading(false);
        }
    }

    async callChatAPI(message) {
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // Ya no necesitamos Authorization header
            },
            body: JSON.stringify({
                message: message,
                chatHistory: this.chatHistory
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.response || 'No se pudo obtener una respuesta.';
    }

    addMessage(content, type) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const now = new Date();
        const timeString = now.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageDiv.innerHTML = `
            <div class="message-content">${this.formatMessage(content)}</div>
            <div class="message-time">${timeString}</div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Guardar en historial
        this.chatHistory.push({
            role: type === 'user' ? 'user' : 'assistant',
            content: content
        });

        // Limitar historial a 10 mensajes
        if (this.chatHistory.length > 10) {
            this.chatHistory = this.chatHistory.slice(-10);
        }
    }

    formatMessage(content) {
        // Formatear markdown básico
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    setLoading(loading) {
        this.isLoading = loading;
        const loadingDiv = document.getElementById('chat-loading');
        const sendBtn = document.getElementById('chat-send');
        
        if (loading) {
            loadingDiv.style.display = 'flex';
            sendBtn.disabled = true;
        } else {
            loadingDiv.style.display = 'none';
            this.updateSendButton();
        }
    }

    updateSendButton() {
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('chat-send');
        sendBtn.disabled = !input.value.trim() || this.isLoading;
    }


    loadChatHistory() {
        // Cargar historial desde localStorage
        try {
            const saved = localStorage.getItem('chat-widget-history');
            if (saved) {
                this.chatHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error cargando historial:', error);
        }
    }

    saveChatHistory() {
        // Guardar historial en localStorage
        try {
            localStorage.setItem('chat-widget-history', JSON.stringify(this.chatHistory));
        } catch (error) {
            console.error('Error guardando historial:', error);
        }
    }
}

// Configuración del widget
window.CHAT_WIDGET_CONFIG = {
    apiKey: 'tu-api-key-aqui', // Reemplazar con tu API key real
    apiUrl: 'https://tu-proyecto.supabase.co/functions/v1/chat'
};

// Inicializar widget cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new ChatWidget();
});

// Función para integrar en Shopify
window.initChatWidget = function(config = {}) {
    // Mergear configuración
    Object.assign(window.CHAT_WIDGET_CONFIG, config);
    
    // Inicializar widget
    if (!window.chatWidgetInstance) {
        window.chatWidgetInstance = new ChatWidget();
    }
};

// Exportar para uso global
window.ChatWidget = ChatWidget;
