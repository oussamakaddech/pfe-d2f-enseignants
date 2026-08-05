package tn.esprit.d2f.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistration;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import tn.esprit.d2f.websocket.NotificationWebSocketHandler;
import tn.esprit.d2f.websocket.WebSocketSessionRegistry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("WebSocketConfig - Tests unitaires")
class WebSocketConfigTest {

    @Test
    @DisplayName("notificationWebSocketHandler - doit retourner un handler lié au registry")
    void notificationWebSocketHandler_shouldBeLinkedToRegistry() {
        WebSocketSessionRegistry registry = new WebSocketSessionRegistry();
        WebSocketConfig config = new WebSocketConfig(null, registry);

        NotificationWebSocketHandler handler = config.notificationWebSocketHandler();

        assertThat(handler).isNotNull();
    }

    @Test
    @DisplayName("registerWebSocketHandlers - doit enregistrer le handler sur /ws/notifications")
    void registerWebSocketHandlers_shouldRegisterEndpoint() {
        WebSocketSessionRegistry registry = new WebSocketSessionRegistry();
        WebSocketConfig config = new WebSocketConfig(null, registry);
        WebSocketHandlerRegistry handlerRegistry = mock(WebSocketHandlerRegistry.class);
        WebSocketHandlerRegistration registration = mock(WebSocketHandlerRegistration.class);

        when(handlerRegistry.addHandler(any(NotificationWebSocketHandler.class), eq("/ws/notifications")))
                .thenReturn(registration);
        when(registration.addInterceptors(any(org.springframework.web.socket.server.HandshakeInterceptor[].class)))
                .thenReturn(registration);

        config.registerWebSocketHandlers(handlerRegistry);

        verify(handlerRegistry).addHandler(any(NotificationWebSocketHandler.class), eq("/ws/notifications"));
    }

    @Test
    @DisplayName("registerWebSocketHandlers - doit ajouter interceptor et autoriser toutes les origines")
    void registerWebSocketHandlers_shouldAddInterceptorAndAllowOrigins() {
        WebSocketSessionRegistry registry = new WebSocketSessionRegistry();
        WebSocketConfig config = new WebSocketConfig(null, registry);
        WebSocketHandlerRegistry handlerRegistry = mock(WebSocketHandlerRegistry.class);
        WebSocketHandlerRegistration registration = mock(WebSocketHandlerRegistration.class);

        when(handlerRegistry.addHandler(any(NotificationWebSocketHandler.class), eq("/ws/notifications")))
                .thenReturn(registration);
        when(registration.addInterceptors(any(org.springframework.web.socket.server.HandshakeInterceptor[].class)))
                .thenReturn(registration);
        when(registration.setAllowedOrigins(any(String[].class))).thenReturn(registration);

        config.registerWebSocketHandlers(handlerRegistry);

        verify(registration).addInterceptors(any(org.springframework.web.socket.server.HandshakeInterceptor[].class));
        verify(registration).setAllowedOrigins("*");
    }

    @Test
    @DisplayName("WebSocketConfig - doit être annoté @Configuration et @EnableWebSocket")
    void websocketConfig_shouldHaveCorrectAnnotations() {
        assertThat(WebSocketConfig.class.isAnnotationPresent(
                org.springframework.context.annotation.Configuration.class)).isTrue();
        assertThat(WebSocketConfig.class.isAnnotationPresent(
                org.springframework.web.socket.config.annotation.EnableWebSocket.class)).isTrue();
    }
}
