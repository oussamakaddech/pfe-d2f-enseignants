package esprit.pfe.serviceformation.messaging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Publie les événements du workflow d'animation vers RabbitMQ.
 *
 * <p>Idempotence producteur : chaque transition porte un {@code eventId}
 * UUID — le consommateur déduit les doublons. L'échec de publication n'interdit
 * jamais la transition métier (le statut BD fait foi), il est journalisé pour
 * reprise.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnimatorProposalEventPublisher {

    public static final String ANIMATOR_EVENTS_QUEUE = "d2f.animator.events";
    public static final String ANIMATOR_EVENTS_DLQ = "d2f.animator.events.dlq";

    private final RabbitTemplate rabbitTemplate;

    public void publishProposalCreated(AnimatorProposalEvent evt) {
        publish(evt, "AnimatorProposalCreated");
    }

    public void publishProposalAccepted(AnimatorProposalEvent evt) {
        publish(evt, "AnimatorProposalAccepted");
    }

    public void publishProposalApproved(AnimatorProposalEvent evt) {
        publish(evt, "AnimatorProposalApproved");
    }

    public void publishAnimatorAssigned(FormationAnimatorEvent evt) {
        publish(evt, "FormationAnimatorAssigned");
    }

    public void publishFormationConfirmed(FormationAnimatorEvent evt) {
        publish(evt, "FormationConfirmed");
    }

    public void publishCalendarInvitationRequested(FormationAnimatorEvent evt) {
        publish(evt, "CalendarInvitationRequested");
    }

    private void publish(Object evt, String type) {
        try {
            rabbitTemplate.convertAndSend(ANIMATOR_EVENTS_QUEUE, evt);
            log.info("Événement {} publié (queue {})", type, ANIMATOR_EVENTS_QUEUE);
        } catch (Exception e) {
            // Consultatif : la transition métier reste acquise, journal pour reprise.
            log.warn("Publication {} impossible : {}", type, e.getMessage());
        }
    }

    /** Génère un identifiant d'événement unique. */
    public static String newEventId() {
        return UUID.randomUUID().toString();
    }
}
