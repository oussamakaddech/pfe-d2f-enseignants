package tn.esprit.d2f.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import tn.esprit.d2f.dto.NotificationRequest;
import tn.esprit.d2f.service.INotificationService;

/**
 * Consommateur des événements métier réels publiés par les autres services sur
 * l'exchange {@code d2f.notifications}. Chaque message devient une vraie
 * notification persistée et poussée en temps réel.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DomainEventNotificationListener {

    private final INotificationService notificationService;

    @RabbitListener(queues = "${rabbitmq.queue.notifications:d2f.notifications.events}")
    public void onNotificationEvent(NotificationRequest event) {
        if (event == null || event.recipient() == null || event.recipient().isBlank()) {
            log.warn("[amqp] événement de notification ignoré : payload invalide");
            return;
        }
        log.info("[amqp] notification reçue pour {} ({})", event.recipient(), event.type());
        notificationService.create(event);
    }
}
