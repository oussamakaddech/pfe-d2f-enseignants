package tn.esprit.d2f.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.esprit.d2f.dto.NotificationResponse;
import tn.esprit.d2f.service.NotificationWebSocketService;
import tn.esprit.d2f.websocket.NotificationWebSocketHandler;
import tn.esprit.d2f.websocket.WebSocketSessionRegistry;

import java.util.Collection;

/**
 * Implémentation du push temps réel : sérialise la réponse en JSON et l'envoie
 * à toutes les sessions WebSocket actives du (des) destinataire(s).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationWebSocketServiceImpl implements NotificationWebSocketService {

    private final WebSocketSessionRegistry registry;
    private final NotificationWebSocketHandler handler;
    private final ObjectMapper objectMapper;

    @Override
    public void pushToUser(String recipient, NotificationResponse notification) {
        pushToUsers(java.util.List.of(recipient), notification);
    }

    @Override
    public void pushToUsers(Collection<String> recipients, NotificationResponse notification) {
        try {
            String json = objectMapper.writeValueAsString(notification);
            for (String recipient : recipients) {
                for (var session : registry.getSessions(recipient)) {
                    handler.send(session, json);
                }
            }
        } catch (Exception e) {
            log.warn("[ws] échec sérialisation notification : {}", e.getMessage());
        }
    }
}
