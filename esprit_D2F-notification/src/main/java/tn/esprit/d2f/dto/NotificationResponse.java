package tn.esprit.d2f.dto;

import tn.esprit.d2f.entity.Notification;
import tn.esprit.d2f.entity.enumerations.NotificationSeverity;
import tn.esprit.d2f.entity.enumerations.NotificationType;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * DTO de réponse pour Notification (DSI #7 : ne pas exposer l'entité JPA brute).
 * Le champ {@code id} est une chaîne (idNotification) pour un mapping 1:1 avec
 * le modèle front {@code AppNotification}.
 */
public record NotificationResponse(
        String id,
        NotificationType type,
        NotificationSeverity severity,
        String title,
        String message,
        boolean read,
        String recipient,
        String link,
        String actor,
        LocalDateTime createdAt,
        Map<String, Object> meta
) implements Serializable {

    public static NotificationResponse from(Notification n, Map<String, Object> meta) {
        if (n == null) {
            return null;
        }
        return new NotificationResponse(
                String.valueOf(n.getIdNotification()),
                n.getType(),
                n.getSeverity(),
                n.getTitle(),
                n.getMessage(),
                n.isRead(),
                n.getRecipient(),
                n.getLink(),
                n.getActor(),
                n.getCreatedAt(),
                meta
        );
    }
}
