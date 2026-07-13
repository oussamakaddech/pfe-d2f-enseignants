package tn.esprit.d2f.mapper;

import org.springframework.stereotype.Component;
import tn.esprit.d2f.dto.NotificationRequest;
import tn.esprit.d2f.entity.Notification;

/**
 * Mappe les requêtes entrantes ({@link NotificationRequest}) vers l'entité JPA.
 * Le {@code meta} n'est pas persisté en colonne dédiée (hors scope) mais est
 * transmis tel-quel dans la réponse pour l'UI.
 */
@Component
public class NotificationMapper {

    public Notification toEntity(NotificationRequest request) {
        Notification n = new Notification();
        n.setRecipient(request.recipient());
        n.setType(request.type());
        n.setSeverity(request.severity());
        n.setTitle(request.title());
        n.setMessage(request.message());
        n.setLink(request.link());
        n.setActor(request.actor());
        n.setRead(false);
        return n;
    }
}
