package tn.esprit.d2f.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.entity.Notification;

import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByRecipientOrderByCreatedAtDesc(String recipient, Pageable pageable);

    Page<Notification> findByRecipientAndReadOrderByCreatedAtDesc(String recipient, boolean read, Pageable pageable);

    Optional<Notification> findByIdNotificationAndRecipient(Long idNotification, String recipient);

    long countByRecipient(String recipient);

    long countByRecipientAndRead(String recipient, boolean read);

    void deleteByRecipient(String recipient);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Notification n SET n.read = true WHERE n.recipient = :recipient AND n.read = false")
    long markAllAsReadForRecipient(String recipient);
}
