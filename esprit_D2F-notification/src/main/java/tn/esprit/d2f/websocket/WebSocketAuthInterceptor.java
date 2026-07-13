package tn.esprit.d2f.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * Authentifie la poignée de main WebSocket via le JWT porté par le cookie
 * HttpOnly {@code d2f_auth_token} (le navigateur l'envoie automatiquement),
 * puis stocke le destinataire résolu dans les attributs de session.
 */
@Slf4j
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements HandshakeInterceptor {

    private static final String COOKIE_NAME = "d2f_auth_token";
    private static final String RECIPIENT_ATTR = "recipient";

    private final JwtDecoder jwtDecoder;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request, ServerHttpResponse response,
            WebSocketHandler wsHandler, Map<String, Object> attributes
    ) {
        String token = extractCookie(request, COOKIE_NAME);
        if (token == null) {
            log.warn("[ws] handshake rejeté : cookie JWT absent");
            return false;
        }
        try {
            Jwt jwt = jwtDecoder.decode(token);
            String recipient = resolveRecipient(jwt);
            attributes.put(RECIPIENT_ATTR, recipient);
            return true;
        } catch (Exception e) {
            log.warn("[ws] handshake rejeté : JWT invalide ({})", e.getMessage());
            return false;
        }
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request, ServerHttpResponse response,
            WebSocketHandler wsHandler, Exception exception
    ) {
        /* rien */
    }

    private String resolveRecipient(Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        if (email != null && !email.isBlank()) return email;
        String username = jwt.getClaimAsString("preferred_username");
        if (username != null && !username.isBlank()) return username;
        String sub = jwt.getSubject();
        return sub != null ? sub : "anonymous";
    }

    private String extractCookie(ServerHttpRequest request, String name) {
        String header = request.getHeaders().getFirst(HttpHeaders.COOKIE);
        if (header == null) return null;
        for (String part : header.split(";")) {
            String trimmed = part.trim();
            if (trimmed.startsWith(name + "=")) {
                return trimmed.substring((name + "=").length());
            }
        }
        return null;
    }
}
