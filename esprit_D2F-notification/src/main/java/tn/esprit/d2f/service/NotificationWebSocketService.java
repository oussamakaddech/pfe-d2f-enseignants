package tn.esprit.d2f.service;

import tn.esprit.d2f.dto.NotificationResponse;

import java.util.Collection;

/**
 * Service de push temps réel des notifications vers les clients connectés (WS).
 */
public interface NotificationWebSocketService {

    void pushToUser(String recipient, NotificationResponse notification);

    void pushToUsers(Collection<String> recipients, NotificationResponse notification);
}
