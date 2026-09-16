package esprit.pfe.serviceformation.messaging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Publie des événements légers vers la queue d2f.analytics.trigger
 * pour le service predictive-analytics (analyse event-driven).
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class AnalyticsEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    private static final String ANALYTICS_QUEUE = "d2f.analytics.trigger";

    public void sendEvent(String event, String enseignantId) {
        try {
            Map<String, String> payload = Map.of(
                    "event", event,
                    "enseignantId", enseignantId
            );
            rabbitTemplate.convertAndSend(ANALYTICS_QUEUE, payload);
            log.info("Analytics event published: {} for enseignant {}", event, enseignantId);
        } catch (Exception exc) {
            log.warn("Failed to publish analytics event {} for {}: {}", event, enseignantId, exc.getMessage());
        }
    }
}
