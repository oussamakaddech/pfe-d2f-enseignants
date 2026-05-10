package esprit.pfe.serviceevaluation.messaging;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class MessagingDataTest {

    @Test
    void testEvaluationBatchMessage() {
        EvaluationBatchMessage msg1 = new EvaluationBatchMessage();
        msg1.setFormationId(1L);
        EvaluationBatchMessage.EvaluationItem item = new EvaluationBatchMessage.EvaluationItem();
        item.setEnseignantId("ens1");
        msg1.setEvaluations(List.of(item));

        EvaluationBatchMessage msg2 = new EvaluationBatchMessage();
        msg2.setFormationId(1L);
        msg2.setEvaluations(List.of(item));

        assertEquals(1L, msg1.getFormationId());
        assertEquals(1, msg1.getEvaluations().size());
        assertEquals(msg1, msg2);
        assertEquals(msg1.hashCode(), msg2.hashCode());
        assertNotNull(msg1.toString());
    }

    @Test
    void testEvaluationItem() {
        EvaluationBatchMessage.EvaluationItem item1 = new EvaluationBatchMessage.EvaluationItem();
        item1.setIdEvalParticipant(1L);
        item1.setEnseignantId("ens1");
        item1.setNote(15.0f);
        item1.setSatisfaisant(true);
        item1.setCommentaire("Good");

        EvaluationBatchMessage.EvaluationItem item2 = new EvaluationBatchMessage.EvaluationItem();
        item2.setIdEvalParticipant(1L);
        item2.setEnseignantId("ens1");
        item2.setNote(15.0f);
        item2.setSatisfaisant(true);
        item2.setCommentaire("Good");

        assertEquals(1L, item1.getIdEvalParticipant());
        assertEquals("ens1", item1.getEnseignantId());
        assertEquals(15.0f, item1.getNote());
        assertTrue(item1.isSatisfaisant());
        assertEquals("Good", item1.getCommentaire());
        
        assertEquals(item1, item2);
        assertEquals(item1.hashCode(), item2.hashCode());
        assertNotNull(item1.toString());
        
        // Test inequality
        item2.setNote(10.0f);
        assertNotEquals(item1, item2);
    }
}
