package tn.esprit.d2f.dto;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.Mockito.*;

/**
 * Tests unitaires pour BesoinFormationEventPublisher.
 *
 * Le champ {@code queueName} est normalement injecté par @Value ; en test unitaire
 * sans Spring, on utilise ReflectionTestUtils pour le positionner manuellement.
 *
 * Note : @CircuitBreaker n'est pas actif hors contexte Spring AOP — la méthode
 * publish() s'exécute directement, ce qui est le comportement attendu en test unitaire.
 */
class BesoinFormationEventPublisherTest {

    private static final String QUEUE = "besoin-formation.approved";

    private RabbitTemplate rabbitTemplate;
    private BesoinFormationEventPublisher publisher;

    @BeforeEach
    void setUp() {
        rabbitTemplate = mock(RabbitTemplate.class);
        publisher = new BesoinFormationEventPublisher(rabbitTemplate);
        // Inject @Value field manually (no Spring context in unit test)
        ReflectionTestUtils.setField(publisher, "queueName", QUEUE);
    }

    @Test
    void testPublish() {
        BesoinFormationApprovedEvent event = new BesoinFormationApprovedEvent();
        publisher.publish(event);

        verify(rabbitTemplate).convertAndSend(QUEUE, event);
    }

    @Test
    void testPublishFallback_doesNotThrow() {
        BesoinFormationApprovedEvent event = new BesoinFormationApprovedEvent();
        RuntimeException cause = new RuntimeException("RabbitMQ unavailable");

        // Fallback method must never propagate exceptions (circuit open scenario)
        publisher.publishFallback(event, cause);

        verifyNoInteractions(rabbitTemplate);
    }
}
