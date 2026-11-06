package esprit.pfe.serviceformation.messaging;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * Tests du publisher d'événements d'animation : publication RabbitMQ et
 * résilience (l'échec de publication n'interdit jamais la transition métier).
 */
@ExtendWith(MockitoExtension.class)
class AnimatorProposalEventPublisherTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    @InjectMocks
    private AnimatorProposalEventPublisher publisher;

    private AnimatorProposalEvent sampleEvent() {
        return AnimatorProposalEvent.builder()
                .eventId(AnimatorProposalEventPublisher.newEventId())
                .eventType("CREATED")
                .proposalId(1L)
                .formationId(1L)
                .build();
    }

    private FormationAnimatorEvent sampleAnimatorEvent() {
        return FormationAnimatorEvent.builder()
                .eventId(AnimatorProposalEventPublisher.newEventId())
                .eventType("ANIMATOR_ASSIGNED")
                .assignmentId(7L)
                .formationId(1L)
                .build();
    }

    @Test
    void publishProposalCreated_envoieSurLaQueueAnimator() {
        AnimatorProposalEvent evt = sampleEvent();
        publisher.publishProposalCreated(evt);
        verify(rabbitTemplate).convertAndSend("d2f.animator.events", evt);
    }

    @Test
    void publishProposalAccepted_envoieSurLaQueueAnimator() {
        AnimatorProposalEvent evt = sampleEvent();
        publisher.publishProposalAccepted(evt);
        verify(rabbitTemplate).convertAndSend("d2f.animator.events", evt);
    }

    @Test
    void publishProposalApproved_envoieSurLaQueueAnimator() {
        AnimatorProposalEvent evt = sampleEvent();
        publisher.publishProposalApproved(evt);
        verify(rabbitTemplate).convertAndSend("d2f.animator.events", evt);
    }

    @Test
    void publishAnimatorAssigned_envoieSurLaQueueAnimator() {
        FormationAnimatorEvent evt = sampleAnimatorEvent();
        publisher.publishAnimatorAssigned(evt);
        verify(rabbitTemplate).convertAndSend("d2f.animator.events", evt);
    }

    @Test
    void publishFormationConfirmed_envoieSurLaQueueAnimator() {
        FormationAnimatorEvent evt = sampleAnimatorEvent();
        publisher.publishFormationConfirmed(evt);
        verify(rabbitTemplate).convertAndSend("d2f.animator.events", evt);
    }

    @Test
    void publishCalendarInvitationRequested_envoieSurLaQueueAnimator() {
        FormationAnimatorEvent evt = sampleAnimatorEvent();
        publisher.publishCalendarInvitationRequested(evt);
        verify(rabbitTemplate).convertAndSend("d2f.animator.events", evt);
    }

    @Test
    void echecRabbit_neFaitPasEchouerLappelMetier() {
        // La transition métier reste acquise : l'erreur broker est journalisée.
        doThrow(new AmqpException("broker down"))
                .when(rabbitTemplate).convertAndSend(anyString(), any(Object.class));
        // Ne doit PAS propager l'exception.
        publisher.publishProposalCreated(sampleEvent());
        verify(rabbitTemplate).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void newEventId_genereDesIdentifiantsUniques() {
        String id1 = AnimatorProposalEventPublisher.newEventId();
        String id2 = AnimatorProposalEventPublisher.newEventId();
        assertNotNull(id1);
        assertNotEquals(id1, id2);
        assertTrue(id1.length() >= 32);
    }

    @Test
    void queueEtDlqExposeesEnConstantes() {
        assertEquals("d2f.animator.events", AnimatorProposalEventPublisher.ANIMATOR_EVENTS_QUEUE);
        assertEquals("d2f.animator.events.dlq", AnimatorProposalEventPublisher.ANIMATOR_EVENTS_DLQ);
        verifyNoInteractions(rabbitTemplate);
    }
}
