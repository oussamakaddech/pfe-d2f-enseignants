package tn.esprit.d2f.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

/**
 * Handler WebSocket brut (pas de STOMP) : à chaque connexion authentifiée, la
 * session est enregistrée dans le {@link WebSocketSessionRegistry}. Le service
 * métier pousse ensuite les {@link tn.esprit.d2f.dto.NotificationResponse} au
 * format JSON, consommés tels quels par le centre de notifications front.
 */
@Slf4j
@RequiredArgsConstructor
public class NotificationWebSocketHandler extends TextWebSocketHandler {

    private static final String RECIPIENT_ATTR = "recipient";

    private final WebSocketSessionRegistry registry;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String recipient = (String) session.getAttributes().get(RECIPIENT_ATTR);
        if (recipient != null) {
            registry.register(recipient, session);
            log.debug("[ws] session ouverte pour {}", recipient);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String recipient = (String) session.getAttributes().get(RECIPIENT_ATTR);
        if (recipient != null) {
            registry.unregister(recipient, session);
            log.debug("[ws] session fermée pour {} ({})", recipient, status);
        }
    }

    /** Envoie un message JSON à une session (no-op si fermée). */
    public void send(WebSocketSession session, String json) {
        try {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(json));
            }
        } catch (Exception e) {
            log.warn("[ws] échec envoi vers {} : {}", session.getId(), e.getMessage());
        }
    }
}
