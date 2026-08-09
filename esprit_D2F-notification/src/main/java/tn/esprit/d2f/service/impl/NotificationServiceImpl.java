package tn.esprit.d2f.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.d2f.dto.NotificationCountResponse;
import tn.esprit.d2f.dto.NotificationRequest;
import tn.esprit.d2f.dto.NotificationResponse;
import tn.esprit.d2f.entity.Notification;
import tn.esprit.d2f.mapper.NotificationMapper;
import tn.esprit.d2f.repository.NotificationRepository;
import tn.esprit.d2f.service.INotificationService;
import tn.esprit.d2f.service.NotificationWebSocketService;

import java.util.Map;
import java.util.Optional;

import tn.esprit.d2f.exception.ResourceNotFoundException;

/**
 * Implémentation du service de notifications.
 *
 * <p>Chaque création persiste une vraie notification (données réelles issues des
 * événements métier) et la pousse immédiatement aux clients connectés via
 * WebSocket. Les actions de l'utilisateur (lu / supprimé) sont également
 * reflétées en temps réel côté front.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationServiceImpl implements INotificationService {

    private final NotificationRepository repository;
    private final NotificationMapper mapper;
    private final NotificationWebSocketService webSocketService;

    @Override
    public NotificationResponse create(NotificationRequest request) {
        Notification entity = mapper.toEntity(request);
        Notification saved = repository.save(entity);
        if (saved == null) {
            throw new IllegalStateException("La notification n'a pas pu être persistée");
        }
        Map<String, Object> meta = request.meta() == null ? Map.of() : request.meta();
        NotificationResponse response = NotificationResponse.from(saved, meta);
        log.info("[notification] créée pour {} — {} : {}", saved.getRecipient(), saved.getType(), saved.getTitle());
        webSocketService.pushToUser(saved.getRecipient(), response);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationResponse> listForRecipient(String recipient, boolean unreadOnly, Pageable pageable) {
        Page<Notification> page = unreadOnly
                ? repository.findByRecipientAndReadOrderByCreatedAtDesc(recipient, false, pageable)
                : repository.findByRecipientOrderByCreatedAtDesc(recipient, pageable);
        return page.map(n -> NotificationResponse.from(n, Map.of()));
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationCountResponse countForRecipient(String recipient) {
        return new NotificationCountResponse(
                repository.countByRecipient(recipient),
                repository.countByRecipientAndRead(recipient, false)
        );
    }

    @Override
    @Transactional
    public NotificationResponse markAsRead(Long id, String recipient) {
        Notification n = repository.findByIdNotificationAndRecipient(id, recipient)
                .orElseThrow(() -> new ResourceNotFoundException("Notification non trouvée"));
        n.setRead(true);
        Notification saved = repository.save(n);
        NotificationResponse response = NotificationResponse.from(saved, Map.of());
        webSocketService.pushToUser(recipient, response);
        return response;
    }

    @Override
    @Transactional
    public long markAllAsRead(String recipient) {
        return repository.markAllAsReadForRecipient(recipient);
    }

    @Override
    @Transactional
    public void delete(Long id, String recipient) {
        Notification n = repository.findByIdNotificationAndRecipient(id, recipient)
                .orElseThrow(() -> new ResourceNotFoundException("Notification non trouvée"));
        repository.delete(n);
    }

    @Override
    @Transactional
    public void deleteAll(String recipient) {
        repository.deleteByRecipient(recipient);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<NotificationResponse> findById(Long id, String recipient) {
        return repository.findByIdNotificationAndRecipient(id, recipient)
                .map(n -> NotificationResponse.from(n, Map.of()));
    }
}
