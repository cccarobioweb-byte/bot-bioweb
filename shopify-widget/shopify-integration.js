// Shopify Chat Widget Integration Script
// Este script se debe agregar al theme.liquid de Shopify

(function() {
    'use strict';

    // Configuración del widget
    const CHAT_CONFIG = {
        // Ya no necesitamos API key - usamos endpoint público
        apiUrl: 'https://tumrqxsqnmznlqeqwfgx.supabase.co/functions/v1/shopify-chat',
        position: 'bottom-right', // bottom-right, bottom-left
        theme: 'default', // default, dark, custom
        showOnPages: ['all'], // ['all', 'home', 'product', 'collection', 'cart', 'checkout']
        hideOnPages: [], // Páginas donde no mostrar el widget
        delay: 3000, // Delay en ms antes de mostrar el widget
        autoOpen: false, // Abrir automáticamente después del delay
        showWelcomeMessage: true
    };

    // Verificar si estamos en una página donde mostrar el widget
    function shouldShowWidget() {
        const currentPage = getCurrentPageType();
        
        if (CHAT_CONFIG.hideOnPages.includes(currentPage)) {
            return false;
        }
        
        if (CHAT_CONFIG.showOnPages.includes('all')) {
            return true;
        }
        
        return CHAT_CONFIG.showOnPages.includes(currentPage);
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

    // Cargar recursos del widget
    function loadWidgetResources() {
        return new Promise((resolve, reject) => {
            const resources = [
                { type: 'css', url: 'https://tu-dominio.com/chat-widget.css' },
                { type: 'js', url: 'https://tu-dominio.com/chat-widget.js' }
            ];

            let loadedCount = 0;
            const totalResources = resources.length;

            resources.forEach(resource => {
                if (resource.type === 'css') {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = resource.url;
                    link.onload = () => {
                        loadedCount++;
                        if (loadedCount === totalResources) resolve();
                    };
                    link.onerror = reject;
                    document.head.appendChild(link);
                } else if (resource.type === 'js') {
                    const script = document.createElement('script');
                    script.src = resource.url;
                    script.onload = () => {
                        loadedCount++;
                        if (loadedCount === totalResources) resolve();
                    };
                    script.onerror = reject;
                    document.head.appendChild(script);
                }
            });
        });
    }

    // Crear HTML del widget
    function createWidgetHTML() {
        const position = CHAT_CONFIG.position === 'bottom-left' ? 'left: 20px; right: auto;' : 'right: 20px; left: auto;';
        
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

    // Inicializar widget
    function initWidget() {
        if (!shouldShowWidget()) {
            return;
        }

        // Cargar recursos
        loadWidgetResources()
            .then(() => {
                // Agregar HTML del widget
                document.body.insertAdjacentHTML('beforeend', createWidgetHTML());
                
                // Configurar widget
                window.CHAT_WIDGET_CONFIG = CHAT_CONFIG;
                
                // Inicializar widget
                if (window.ChatWidget) {
                    window.chatWidgetInstance = new window.ChatWidget();
                    
                    // Auto-abrir si está configurado
                    if (CHAT_CONFIG.autoOpen) {
                        setTimeout(() => {
                            window.chatWidgetInstance.openChat();
                        }, CHAT_CONFIG.delay);
                    }
                }
            })
            .catch(error => {
                console.error('Error cargando chat widget:', error);
            });
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
    } else {
        initWidget();
    }

    // Función para configurar el widget desde Shopify
    window.configureChatWidget = function(config) {
        Object.assign(CHAT_CONFIG, config);
    };

    // Función para abrir el widget programáticamente
    window.openChatWidget = function() {
        if (window.chatWidgetInstance) {
            window.chatWidgetInstance.openChat();
        }
    };

    // Función para cerrar el widget programáticamente
    window.closeChatWidget = function() {
        if (window.chatWidgetInstance) {
            window.chatWidgetInstance.closeChat();
        }
    };

})();
