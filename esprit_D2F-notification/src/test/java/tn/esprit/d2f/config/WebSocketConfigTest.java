package tn.esprit.d2f.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistration;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;
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

    private static final JwtDecoder DECODER = null;

    private WebSocketHandlerRegistry mockRegistry(WebSocketHandlerRegistration registration) {
        WebSocketHandlerRegistry handlerRegistry = mock(WebSocketHandlerRegistry.class);
        when(handlerRegistry.addHandler(any(NotificationWebSocketHandler.class), eq("/ws/notifications")))
                .thenReturn(registration);
        when(registration.addInterceptors(any(HandshakeInterceptor[].class)))
                .thenReturn(registration);
        when(registration.setAllowedOrigins(any(String[].class)))
                .thenReturn(registration);
        return handlerRegistry;
    }

    @Test
    @DisplayName("parseAllowedOrigins - doit retourner les origines locales par défaut si la propriété est null")
    void parseAllowedOrigins_shouldFallbackToDefaultsOnNull() {
        assertThat(WebSocketConfig.parseAllowedOrigins(null))
                .containsExactly("http://localhost:5173", "http://localhost:3000");
    }

    @Test
    @DisplayName("parseAllowedOrigins - doit retourner les origines par défaut si la propriété est vide")
    void parseAllowedOrigins_shouldFallbackToDefaultsOnBlank() {
        assertThat(WebSocketConfig.parseAllowedOrigins("   "))
                .containsExactly("http://localhost:5173", "http://localhost:3000");
        assertThat(WebSocketConfig.parseAllowedOrigins(" , ,, "))
                .containsExactly("http://localhost:5173", "http://localhost:3000");
    }

    @Test
    @DisplayName("parseAllowedOrigins - doit découper et nettoyer la liste d'origines")
    void parseAllowedOrigins_shouldSplitAndTrim() {
        assertThat(WebSocketConfig.parseAllowedOrigins(
                " https://d2f.esprit.tn , http://localhost:4200,,https://preprod.d2f.esprit.tn "))
                .containsExactly(
                        "https://d2f.esprit.tn",
                        "http://localhost:4200",
                        "https://preprod.d2f.esprit.tn");
    }

    @Test
    @DisplayName("notificationWebSocketHandler - doit retourner un handler lié au registry")
    void notificationWebSocketHandler_shouldBeLinkedToRegistry() {
        WebSocketSessionRegistry registry = new WebSocketSessionRegistry();
        WebSocketConfig config = new WebSocketConfig(DECODER, registry,
                "http://localhost:5173,http://localhost:3000");

        NotificationWebSocketHandler handler = config.notificationWebSocketHandler();

        assertThat(handler).isNotNull();
    }

    @Test
    @DisplayName("registerWebSocketHandlers - doit enregistrer le handler sur /ws/notifications")
    void registerWebSocketHandlers_shouldRegisterEndpoint() {
        WebSocketSessionRegistry registry = new WebSocketSessionRegistry();
        WebSocketConfig config = new WebSocketConfig(DECODER, registry,
                "http://localhost:5173,http://localhost:3000");
        WebSocketHandlerRegistration registration = mock(WebSocketHandlerRegistration.class);
        WebSocketHandlerRegistry handlerRegistry = mockRegistry(registration);

        config.registerWebSocketHandlers(handlerRegistry);

        verify(handlerRegistry).addHandler(any(NotificationWebSocketHandler.class), eq("/ws/notifications"));
    }

    @Test
    @DisplayName("registerWebSocketHandlers - doit ajouter l'interceptor d'authentification JWT")
    void registerWebSocketHandlers_shouldAddInterceptor() {
        WebSocketSessionRegistry registry = new WebSocketSessionRegistry();
        WebSocketConfig config = new WebSocketConfig(DECODER, registry,
                "http://localhost:5173,http://localhost:3000");
        WebSocketHandlerRegistration registration = mock(WebSocketHandlerRegistration.class);
        WebSocketHandlerRegistry handlerRegistry = mockRegistry(registration);

        config.registerWebSocketHandlers(handlerRegistry);

        verify(registration).addInterceptors(any(HandshakeInterceptor[].class));
    }

    @Test
    @DisplayName("registerWebSocketHandlers - doit appliquer les origines réellement configurées")
    void registerWebSocketHandlers_shouldApplyConfiguredOrigins() {
        WebSocketSessionRegistry registry = new WebSocketSessionRegistry();
        WebSocketConfig config = new WebSocketConfig(DECODER, registry,
                "http://localhost:5173,http://localhost:3000");
        WebSocketHandlerRegistration registration = mock(WebSocketHandlerRegistration.class);
        WebSocketHandlerRegistry handlerRegistry = mockRegistry(registration);

        config.registerWebSocketHandlers(handlerRegistry);

        verify(registration).setAllowedOrigins("http://localhost:5173", "http://localhost:3000");
    }

    @Test
    @DisplayName("registerWebSocketHandlers - doit retomber sur les origines par défaut sans configuration")
    void registerWebSocketHandlers_shouldApplyDefaultOriginsWhenUnconfigured() {
        WebSocketSessionRegistry registry = new WebSocketSessionRegistry();
        WebSocketConfig config = new WebSocketConfig(DECODER, registry, null);
        WebSocketHandlerRegistration registration = mock(WebSocketHandlerRegistration.class);
        WebSocketHandlerRegistry handlerRegistry = mockRegistry(registration);

        config.registerWebSocketHandlers(handlerRegistry);

        verify(registration).setAllowedOrigins("http://localhost:5173", "http://localhost:3000");
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
