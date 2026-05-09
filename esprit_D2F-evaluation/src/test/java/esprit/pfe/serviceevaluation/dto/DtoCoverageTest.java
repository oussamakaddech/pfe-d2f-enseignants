package esprit.pfe.serviceevaluation.dto;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DtoCoverageTest {

    @Test
    void testEnseignantDTO() {
        EnseignantDTO dto = new EnseignantDTO("ens1", "Nom", "Prenom", "mail", "type", "dept", "up");
        
        assertEquals("ens1", dto.getId());
        assertEquals("Nom", dto.getNom());
        assertEquals("Prenom", dto.getPrenom());
        assertEquals("mail", dto.getMail());
    }

    @Test
    void testEvaluationEnseignantDTO() {
        EvaluationEnseignantDTO dto = new EvaluationEnseignantDTO();
        dto.setIdEvalParticipant(1L);
        dto.setEnseignantId("ens1");
        dto.setFormationId(2L);
        dto.setNote(15.0f);
        dto.setSatisfaisant(true);
        dto.setCommentaire("Good");
        
        assertEquals(1L, dto.getIdEvalParticipant());
        assertEquals("ens1", dto.getEnseignantId());
        assertEquals(2L, dto.getFormationId());
        assertEquals(15.0f, dto.getNote());
        assertTrue(dto.isSatisfaisant());
        assertEquals("Good", dto.getCommentaire());
    }

    @Test
    void testFormationDTO() {
        FormationDTO dto = new FormationDTO();
        dto.setIdFormation(1L);
        dto.setTitreFormation("Titre");
        
        assertEquals(1L, dto.getIdFormation());
        assertEquals("Titre", dto.getTitreFormation());
    }
}
