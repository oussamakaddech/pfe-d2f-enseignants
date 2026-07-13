package tn.esprit.d2f.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registre des sessions WebSocket actives, indexées par destinataire
 * (username/email). Permet au service métier de pousser une notification
 * temps réel à tous les onglets connectés d'un utilisateur.
 */
@Component
public class WebSocketSessionRegistry {

    private final ConcurrentHashMap<String, Set<WebSocketSession>> sessionsByRecipient =
            new ConcurrentHashMap<>();

    public void register(String recipient, WebSocketSession session) {
        sessionsByRecipient
                .computeIfAbsent(recipient, k -> ConcurrentHashMap.newKeySet())
                .add(session);
    }

    public void unregister(String recipient, WebSocketSession session) {
        Set<WebSocketSession> set = sessionsByRecipient.get(recipient);
        if (set != null) {
            set.remove(session);
            if (set.isEmpty()) {
                sessionsByRecipient.remove(recipient);
            }
        }
    }

    public Set<WebSocketSession> getSessions(String recipient) {
        return sessionsByRecipient.getOrDefault(recipient, Set.of());
    }
}
