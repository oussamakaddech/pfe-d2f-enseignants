package tn.esprit.d2f.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import tn.esprit.d2f.dto.NotificationCountResponse;
import tn.esprit.d2f.dto.NotificationRequest;
import tn.esprit.d2f.dto.NotificationResponse;

import java.util.Optional;

/**
 * Contrat métier du service de notifications.
 * {@code recipient} = username/email authentifié (extrait du JWT côté resource server).
 */
public interface INotificationService {

    /** Crée une notification pour un destinataire explicite (admin / autre service). */
    NotificationResponse create(NotificationRequest request);

    /** Liste paginée des notifications d'un destinataire (plus récentes d'abord). */
    Page<NotificationResponse> listForRecipient(String recipient, boolean unreadOnly, Pageable pageable);

    /** Compteurs (total / non lues) pour un destinataire. */
    NotificationCountResponse countForRecipient(String recipient);

    /** Marque une notification comme lue. */
    NotificationResponse markAsRead(Long id, String recipient);

    /** Marque toutes les notifications du destinataire comme lues. */
    long markAllAsRead(String recipient);

    /** Supprime une notification (si elle appartient au destinataire). */
    void delete(Long id, String recipient);

    /** Supprime toutes les notifications du destinataire. */
    void deleteAll(String recipient);

    Optional<NotificationResponse> findById(Long id, String recipient);
}
