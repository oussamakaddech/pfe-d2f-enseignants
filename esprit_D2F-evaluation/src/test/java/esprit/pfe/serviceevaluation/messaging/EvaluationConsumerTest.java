package esprit.pfe.serviceevaluation.messaging;

import esprit.pfe.serviceevaluation.services.EvaluationFormateurService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EvaluationConsumerTest {

    @Mock
    private EvaluationFormateurService evalService;
    @InjectMocks
    private EvaluationConsumer consumer;

    @Test
    void onCreateBatch_shouldMapAndCallBulkCreate() {
        EvaluationBatchMessage.EvaluationItem item = new EvaluationBatchMessage.EvaluationItem();
        item.setEnseignantId("ens-1");
        item.setNote(15.0f);
        item.setSatisfaisant(true);
        item.setCommentaire("Bon");

        EvaluationBatchMessage msg = new EvaluationBatchMessage();
        msg.setFormationId(10L);
        msg.setEvaluations(List.of(item));

        consumer.onCreateBatch(msg);

        verify(evalService).createEvaluationsBulk(anyList());
    }

    @Test
    void onUpdateBatch_shouldMapAndCallBulkUpdate() {
        EvaluationBatchMessage.EvaluationItem item = new EvaluationBatchMessage.EvaluationItem();
        item.setIdEvalParticipant(1L);
        item.setEnseignantId("ens-1");
        item.setNote(18.0f);
        item.setSatisfaisant(true);
        item.setCommentaire("Excellent");

        EvaluationBatchMessage msg = new EvaluationBatchMessage();
        msg.setFormationId(10L);
        msg.setEvaluations(List.of(item));

        consumer.onUpdateBatch(msg);

        verify(evalService).updateEvaluationsBulkByFormation(eq(10L), anyList());
    }

    @Test
    void onCreateBatch_multipleItems_shouldMapAll() {
        EvaluationBatchMessage.EvaluationItem item1 = new EvaluationBatchMessage.EvaluationItem();
        item1.setEnseignantId("ens-1");
        item1.setNote(12.0f);
        EvaluationBatchMessage.EvaluationItem item2 = new EvaluationBatchMessage.EvaluationItem();
        item2.setEnseignantId("ens-2");
        item2.setNote(14.0f);

        EvaluationBatchMessage msg = new EvaluationBatchMessage();
        msg.setFormationId(5L);
        msg.setEvaluations(List.of(item1, item2));

        consumer.onCreateBatch(msg);

        verify(evalService).createEvaluationsBulk(argThat(list -> list.size() == 2));
    }

    @Test
    void recover_shouldThrowAmqpRejectAndDontRequeueException() {
        EvaluationBatchMessage msg = new EvaluationBatchMessage();
        msg.setFormationId(10L);
        Exception ex = new RuntimeException("Test exception");

        org.junit.jupiter.api.Assertions.assertThrows(
            org.springframework.amqp.AmqpRejectAndDontRequeueException.class,
            () -> consumer.recover(ex, msg)
        );
    }
}
