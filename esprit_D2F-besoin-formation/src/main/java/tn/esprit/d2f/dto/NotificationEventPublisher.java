package tn.esprit.d2f.dto;

import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Publie les notifications utilisateur vers l'exchange fanout
 * {@code d2f.notifications}, consommé par le service notification
 * ({@code DomainEventNotificationListener}) qui persiste et pousse
 * la notification temps réel au destinataire.
 *
 * <p>Le payload reprend exactement les champs de
 * {@code tn.esprit.d2f.dto.NotificationRequest} côté notification
 * (record JSON : recipient, type, severity, title, message, link,
 * actor, meta). Best-effort : un échec broker ne doit jamais faire
 * échouer le flux métier appelant (la notification locale reste
 * persistée par ailleurs).</p>
 */
@Slf4j
@Component
public class NotificationEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    /** Doit correspondre à {@code rabbitmq.exchange.notifications} côté notification. */
    @Value("${rabbitmq.exchange.notifications:d2f.notifications}")
    private String notificationsExchange;

    public NotificationEventPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    /**
     * Publie une notification BESOIN/INFO. Ne lève jamais d'exception.
     */
    public void publish(String recipient, String title, String message, String link, String actor) {
        if (recipient == null || recipient.isBlank()) {
            return;
        }
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("recipient", recipient);
            payload.put("type", "BESOIN");
            payload.put("severity", "INFO");
            payload.put("title", title != null ? title : "Besoin de formation");
            payload.put("message", message != null ? message : "");
            payload.put("link", link);
            payload.put("actor", actor);
            payload.put("meta", Map.of("source", "besoin-formation"));
            rabbitTemplate.convertAndSend(notificationsExchange, "", payload);
            log.debug("Notification event sent to '{}' for {}", notificationsExchange, recipient);
        } catch (Exception ex) {
            log.warn("Notification event non publié pour {} : {}", recipient, ex.getMessage());
        }
    }
}
