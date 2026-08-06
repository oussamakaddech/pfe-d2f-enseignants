package tn.esprit.d2f.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import tn.esprit.d2f.websocket.NotificationWebSocketHandler;
import tn.esprit.d2f.websocket.WebSocketAuthInterceptor;
import tn.esprit.d2f.websocket.WebSocketSessionRegistry;

/**
 * Configuration WebSocket : expose {@code /ws/notifications} (handler brut,
 * authentifié via cookie JWT) pour le push temps réel des notifications.
 */
@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final JwtDecoder jwtDecoder;
    private final WebSocketSessionRegistry registry;

    @Value("${cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private String allowedOriginsRaw;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry webSocketHandlerRegistry) {
        webSocketHandlerRegistry
                .addHandler(notificationWebSocketHandler(), "/ws/notifications")
                .addInterceptors(new WebSocketAuthInterceptor(jwtDecoder))
                .setAllowedOrigins(allowedOriginsRaw.split(","));
    }

    @Bean
    public NotificationWebSocketHandler notificationWebSocketHandler() {
        return new NotificationWebSocketHandler(registry);
    }
}
