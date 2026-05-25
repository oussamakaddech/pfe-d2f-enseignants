package tn.esprit.d2f.dto;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Publie les événements d'approbation vers RabbitMQ.
 *
 * <p>Fix 4 — corrections :</p>
 * <ul>
 *   <li>Nom de queue externalisé via {@code ${rabbitmq.queue.besoin-approuve}} (était hardcodé
 *       à "BesoinFormationApprovedQueue" alors que RabbitMqConfig déclare "besoin-formation.approved")</li>
 *   <li>Resilience4j Circuit Breaker sur {@code publish()} pour absorber les pannes RabbitMQ</li>
 * </ul>
 */
@Slf4j
@Component
public class BesoinFormationEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    /** Doit correspondre exactement au nom déclaré dans {@link tn.esprit.d2f.config.RabbitMqConfig}. */
    @Value("${rabbitmq.queue.besoin-approuve:besoin-formation.approved}")
    private String queueName;

    public BesoinFormationEventPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    /**
     * Envoie l'événement dans la queue configurée.
     * Le Circuit Breaker {@code besoinPublisher} coupe le circuit après 3 échecs consécutifs
     * et appelle {@link #publishFallback} en repli.
     */
    @CircuitBreaker(name = "besoinPublisher", fallbackMethod = "publishFallback")
    public void publish(BesoinFormationApprovedEvent evt) {
        rabbitTemplate.convertAndSend(queueName, evt);
        log.debug("Event sent to queue '{}' for besoinId={}", queueName, evt.getIdBesoinFormation());
    }

    /** Repli Circuit Breaker : journalise l'échec, la DLQ reprendra le message en attente. */
    public void publishFallback(BesoinFormationApprovedEvent evt, Throwable cause) {
        log.error("Circuit breaker OPEN — could not publish event for besoinId={}: {}",
                evt.getIdBesoinFormation(), cause.getMessage());
    }
}
