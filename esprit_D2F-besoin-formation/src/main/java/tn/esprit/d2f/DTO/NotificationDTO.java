package tn.esprit.d2f.dto;

import tn.esprit.d2f.entity.Notification;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * DTO de réponse pour Notification (DSI #7 : ne pas exposer l'entité JPA brute —
 * masque notamment les champs d'audit createdBy/updatedAt non destinés à l'API).
 */
public record NotificationDTO(
        Long idNotification,
        String message,
        String commentaire,
        String username,
        LocalDateTime createdAt
) implements Serializable {

    public static NotificationDTO from(Notification n) {
        if (n == null) {
            return null;
        }
        return new NotificationDTO(
                n.getIdNotification(),
                n.getMessage(),
                n.getCommentaire(),
                n.getUsername(),
                n.getCreatedAt()
        );
    }
}
