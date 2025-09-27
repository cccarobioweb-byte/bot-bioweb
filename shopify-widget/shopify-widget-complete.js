// Shopify Chat Widget - Versión Completa Todo en Uno
// Este archivo incluye CSS, HTML y JavaScript en un solo archivo

(function() {
    'use strict';

    // CSS del widget
    const widgetCSS = `
        .chat-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .chat-toggle {
            width: 60px;
            height: 60px;
            background: #007bff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
            transition: all 0.3s ease;
            color: white;
        }

        .chat-toggle:hover {
            background: #0056b3;
            transform: scale(1.05);
        }

        .chat-window {
            position: absolute;
            bottom: 80px;
            right: 0;
            width: 350px;
            height: 500px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            display: none;
            flex-direction: column;
            overflow: hidden;
        }

        .chat-window.open {
            display: flex;
        }

        .chat-header {
            background: #007bff;
            color: white;
            padding: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .chat-header-info h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }

        .chat-status {
            font-size: 12px;
            opacity: 0.9;
        }

        .chat-close {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: background 0.2s;
        }

        .chat-close:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .chat-messages {
            flex: 1;
            padding: 16px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .message {
            max-width: 80%;
            word-wrap: break-word;
        }

        .bot-message {
            align-self: flex-start;
        }

        .user-message {
            align-self: flex-end;
        }

        .message-content {
            background: #f8f9fa;
            padding: 12px 16px;
            border-radius: 18px;
            font-size: 14px;
            line-height: 1.4;
        }

        .user-message .message-content {
            background: #007bff;
            color: white;
        }

        .message-time {
            font-size: 11px;
            color: #6c757d;
            margin-top: 4px;
            text-align: right;
        }

        .bot-message .message-time {
            text-align: left;
        }

        .chat-input-container {
            padding: 16px;
            border-top: 1px solid #e9ecef;
        }

        .chat-input-wrapper {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .chat-input {
            flex: 1;
            border: 1px solid #dee2e6;
            border-radius: 20px;
            padding: 10px 16px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
        }

        .chat-input:focus {
            border-color: #007bff;
        }

        .chat-send {
            width: 40px;
            height: 40px;
            background: #007bff;
            border: none;
            border-radius: 50%;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }

        .chat-send:hover:not(:disabled) {
            background: #0056b3;
        }

        .chat-send:disabled {
            background: #6c757d;
            cursor: not-allowed;
        }

        .chat-input-footer {
            margin-top: 8px;
            text-align: center;
        }

        .chat-hint {
            font-size: 11px;
            color: #6c757d;
        }

        .chat-loading {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            color: white;
        }

        .chat-loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
            .chat-window {
                width: calc(100vw - 40px);
                height: calc(100vh - 120px);
                bottom: 80px;
                right: 20px;
                left: 20px;
            }
        }
    `;

    // Configuración del widget
    const CONFIG = {
        apiUrl: window.CHAT_WIDGET_CONFIG?.apiUrl || 'https://tumrqxsqnmznlqeqwfgx.supabase.co/functions/v1/chat',
        position: 'bottom-right',
        showOnPages: ['all'],
        hideOnPages: [],
        delay: 3000,
        autoOpen: false
    };

    // Verificar si estamos en una página donde mostrar el widget
    function shouldShowWidget() {
        const currentPage = getCurrentPageType();
        
        if (CONFIG.hideOnPages.includes(currentPage)) {
            return false;
        }
        
        if (CONFIG.showOnPages.includes('all')) {
            return true;
        }
        
        return CONFIG.showOnPages.includes(currentPage);
    }

    // Obtener tipo de página actual
    function getCurrentPageType() {
        if (window.location.pathname === '/') return 'home';
        if (window.location.pathname.includes('/products/')) return 'product';
        if (window.location.pathname.includes('/collections/')) return 'collection';
        if (window.location.pathname === '/cart') return 'cart';
        if (window.location.pathname.includes('/checkout')) return 'checkout';
        return 'other';
    }

    // Crear HTML del widget
    function createWidgetHTML() {
        const position = CONFIG.position === 'bottom-left' ? 'left: 20px; right: auto;' : 'right: 20px; left: auto;';
        
        return `
            <div id="chat-widget" class="chat-widget" style="${position}">
                <!-- Botón flotante -->
                <div id="chat-toggle" class="chat-toggle">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" fill="currentColor"/>
                        <path d="M7 9H17V11H7V9ZM7 12H15V14H7V12Z" fill="currentColor"/>
                    </svg>
                </div>

                <!-- Ventana de chat -->
                <div id="chat-window" class="chat-window">
                    <!-- Header -->
                    <div class="chat-header">
                        <div class="chat-header-info">
                            <h3>Asistente Técnico</h3>
                            <span class="chat-status">En línea</span>
                        </div>
                        <button id="chat-close" class="chat-close">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>

                    <!-- Mensajes -->
                    <div id="chat-messages" class="chat-messages">
                        <div class="message bot-message">
                            <div class="message-content">
                                ¡Hola! Soy tu asistente especializado en equipos técnicos. ¿En qué puedo ayudarte hoy?
                            </div>
                            <div class="message-time">Ahora</div>
                        </div>
                    </div>

                    <!-- Input -->
                    <div class="chat-input-container">
                        <div class="chat-input-wrapper">
                            <input 
                                type="text" 
                                id="chat-input" 
                                class="chat-input" 
                                placeholder="Escribe tu consulta..."
                                maxlength="500"
                            >
                            <button id="chat-send" class="chat-send" disabled>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 2L9 11L18 20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                        <div class="chat-input-footer">
                            <span class="chat-hint">Pregúntame sobre cualquier producto técnico</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Loading overlay -->
            <div id="chat-loading" class="chat-loading" style="display: none;">
                <div class="chat-loading-spinner"></div>
                <span>Procesando...</span>
            </div>
        `;
    }

    // Clase del widget de chat
    class ChatWidget {
        constructor() {
            this.isOpen = false;
            this.isLoading = false;
            this.chatHistory = [];
            this.apiUrl = CONFIG.apiUrl;
            
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
            const chatWindow = document.getElementById('chat-window');
            chatWindow.classList.add('open');
            this.isOpen = true;
            
            // Focus en el input
            setTimeout(() => {
                document.getElementById('chat-input').focus();
            }, 100);
        }

        closeChat() {
            const chatWindow = document.getElementById('chat-window');
            chatWindow.classList.remove('open');
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
                // Llamar a la API
                const response = await this.callChatAPI(message);
                
                // Agregar respuesta del bot
                this.addMessage(response, 'bot');
                
                // Guardar en historial
                this.chatHistory.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: response }
                );
                this.saveChatHistory();
                
            } catch (error) {
                console.error('Error en chat:', error);
                this.addMessage('Lo siento, ocurrió un error. Por favor intenta nuevamente.', 'bot');
            } finally {
                this.setLoading(false);
            }
        }

        async callChatAPI(message) {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1bXJxeHNxbm16bmxxZXF3Zmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NjU3MDIsImV4cCI6MjA3NDM0MTcwMn0.M3KlRvTk7mb7QLexsNbyaOcJ5pQXvuz4CgDo8_BAG7I',
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1bXJxeHNxbm16bmxxZXF3Zmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NjU3MDIsImV4cCI6MjA3NDM0MTcwMn0.M3KlRvTk7mb7QLexsNbyaOcJ5pQXvuz4CgDo8_BAG7I'
                },
                body: JSON.stringify({
                    message: message,
                    originalMessage: message,
                    chatHistory: this.chatHistory,
                    products: [],
                    brandInfo: [],
                    translationInfo: {
                        wasTranslated: false,
                        detectedLanguage: 'es'
                    },
                    source: 'shopify'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Error en la respuesta');
            }
            
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
                <div class="message-content">${content}</div>
                <div class="message-time">${timeString}</div>
            `;
            
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        setLoading(loading) {
            this.isLoading = loading;
            const loadingOverlay = document.getElementById('chat-loading');
            loadingOverlay.style.display = loading ? 'flex' : 'none';
            this.updateSendButton();
        }

        updateSendButton() {
            const input = document.getElementById('chat-input');
            const sendBtn = document.getElementById('chat-send');
            sendBtn.disabled = !input.value.trim() || this.isLoading;
        }

        loadChatHistory() {
            try {
                const saved = localStorage.getItem('chat-widget-history');
                if (saved) {
                    this.chatHistory = JSON.parse(saved);
                }
            } catch (error) {
                console.error('Error cargando historial:', error);
                this.chatHistory = [];
            }
        }

        saveChatHistory() {
            try {
                localStorage.setItem('chat-widget-history', JSON.stringify(this.chatHistory));
            } catch (error) {
                console.error('Error guardando historial:', error);
            }
        }
    }

    // Inicializar widget
    function initWidget() {
        if (!shouldShowWidget()) {
            return;
        }

        // Agregar CSS
        const style = document.createElement('style');
        style.textContent = widgetCSS;
        document.head.appendChild(style);

        // Agregar HTML del widget
        document.body.insertAdjacentHTML('beforeend', createWidgetHTML());
        
        // Inicializar widget
        window.chatWidgetInstance = new ChatWidget();
        
        // Auto-abrir si está configurado
        if (CONFIG.autoOpen) {
            setTimeout(() => {
                window.chatWidgetInstance.openChat();
            }, CONFIG.delay);
        }
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
    } else {
        initWidget();
    }

    // Funciones globales para control externo
    window.openChatWidget = function() {
        if (window.chatWidgetInstance) {
            window.chatWidgetInstance.openChat();
        }
    };

    window.closeChatWidget = function() {
        if (window.chatWidgetInstance) {
            window.chatWidgetInstance.closeChat();
        }
    };

})();
