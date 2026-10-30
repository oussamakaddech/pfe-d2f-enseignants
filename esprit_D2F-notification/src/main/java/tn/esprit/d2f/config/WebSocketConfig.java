package tn.esprit.d2f.config;

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

import java.util.Arrays;
import java.util.List;

/**
 * Configuration WebSocket : expose {@code /ws/notifications} (handler brut,
 * authentifié via cookie JWT) pour le push temps réel des notifications.
 *
 * <p>Les origines autorisées proviennent de {@code cors.allowed-origins}, injectée
 * par constructeur : la valeur est donc toujours résolue (jamais {@code null}),
 * y compris hors conteneur Spring. Toute valeur absente ou vide retombe sur les
 * origines locales par défaut.</p>
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    static final String[] DEFAULT_ALLOWED_ORIGINS = {
            "http://localhost:5173", "http://localhost:3000"
    };

    private final JwtDecoder jwtDecoder;
    private final WebSocketSessionRegistry registry;
    private final String[] allowedOrigins;

    public WebSocketConfig(
            JwtDecoder jwtDecoder,
            WebSocketSessionRegistry registry,
            @Value("${cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
            String allowedOriginsRaw
    ) {
        this.jwtDecoder = jwtDecoder;
        this.registry = registry;
        this.allowedOrigins = parseAllowedOrigins(allowedOriginsRaw);
    }

    static String[] parseAllowedOrigins(String raw) {
        if (raw != null && !raw.isBlank()) {
            List<String> origins = Arrays.stream(raw.split(","))
                    .map(String::trim)
                    .filter(origin -> !origin.isEmpty())
                    .toList();
            if (!origins.isEmpty()) {
                return origins.toArray(new String[0]);
            }
        }
        return DEFAULT_ALLOWED_ORIGINS.clone();
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry webSocketHandlerRegistry) {
        webSocketHandlerRegistry
                .addHandler(notificationWebSocketHandler(), "/ws/notifications")
                .addInterceptors(new WebSocketAuthInterceptor(jwtDecoder))
                .setAllowedOrigins(allowedOrigins);
    }

    @Bean
    public NotificationWebSocketHandler notificationWebSocketHandler() {
        return new NotificationWebSocketHandler(registry);
    }
}
