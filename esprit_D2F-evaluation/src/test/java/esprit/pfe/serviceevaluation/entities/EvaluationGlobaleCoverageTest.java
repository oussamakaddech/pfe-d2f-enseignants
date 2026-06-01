package esprit.pfe.serviceevaluation.entities;

import esprit.pfe.serviceevaluation.dto.EvaluationGlobaleDTO;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class EvaluationGlobaleCoverageTest {

    @Test
    void testEvaluationGlobaleEntity() {
        EvaluationGlobale e1 = EvaluationGlobale.builder()
                .idEvalGlobale(1L)
                .formationId(10L)
                .noteGlobale(4.5f)
                .commentaireGeneral("Good")
                .build();

        EvaluationGlobale e2 = new EvaluationGlobale();
        e2.setIdEvalGlobale(1L);
        e2.setFormationId(10L);
        e2.setNoteGlobale(4.5f);
        e2.setCommentaireGeneral("Good");

        assertEquals(1L, e1.getIdEvalGlobale());
        assertEquals(10L, e1.getFormationId());
        assertEquals(4.5f, e1.getNoteGlobale());
        assertEquals("Good", e1.getCommentaireGeneral());

        assertEquals(e1, e2);
        assertEquals(e1.hashCode(), e2.hashCode());
        assertNotNull(e1.toString());
    }

    @Test
    void testEvaluationGlobaleDTO() {
        EvaluationGlobaleDTO d1 = EvaluationGlobaleDTO.builder()
                .idEvalGlobale(1L)
                .formationId(10L)
                .noteGlobale(4.5f)
                .commentaireGeneral("Good")
                .build();

        EvaluationGlobaleDTO d2 = new EvaluationGlobaleDTO();
        d2.setIdEvalGlobale(1L);
        d2.setFormationId(10L);
        d2.setNoteGlobale(4.5f);
        d2.setCommentaireGeneral("Good");

        assertEquals(1L, d1.getIdEvalGlobale());
        assertEquals(d1, d2);
        assertEquals(d1.hashCode(), d2.hashCode());
        assertNotNull(d1.toString());
    }
}
