package esprit.pfe.serviceevaluation.dto;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DtoCoverageTest {

    @Test
    void testEnseignantDTO() {
        EnseignantDTO dto1 = new EnseignantDTO("ens1", "Nom", "Prenom", "mail", "type", "dept", "up");
        EnseignantDTO dto2 = new EnseignantDTO("ens1", "Nom", "Prenom", "mail", "type", "dept", "up");
        
        assertEquals("ens1", dto1.getId());
        assertEquals(dto1, dto2);
        assertEquals(dto1.hashCode(), dto2.hashCode());
        assertNotNull(dto1.toString());
    }

    @Test
    void testEvaluationEnseignantDTO() {
        EvaluationEnseignantDTO dto1 = new EvaluationEnseignantDTO();
        dto1.setIdEvalParticipant(1L);
        dto1.setEnseignantId("ens1");
        
        EvaluationEnseignantDTO dto2 = new EvaluationEnseignantDTO();
        dto2.setIdEvalParticipant(1L);
        dto2.setEnseignantId("ens1");
        
        assertEquals(dto1, dto2);
        assertEquals(dto1.hashCode(), dto2.hashCode());
        assertNotNull(dto1.toString());
    }

    @Test
    void testFormationDTO() {
        FormationDTO dto1 = new FormationDTO();
        dto1.setIdFormation(1L);
        dto1.setTitreFormation("Titre");
        
        FormationDTO dto2 = new FormationDTO();
        dto2.setIdFormation(1L);
        dto2.setTitreFormation("Titre");
        
        assertEquals(dto1, dto2);
        assertEquals(dto1.hashCode(), dto2.hashCode());
        assertNotNull(dto1.toString());
    }

    @Test
    void testEvaluationFormateurDTO() {
        EvaluationFormateurDTO dto1 = EvaluationFormateurDTO.builder()
                .idEvalParticipant(1L)
                .build();
        EvaluationFormateurDTO dto2 = new EvaluationFormateurDTO();
        dto2.setIdEvalParticipant(1L);
        
        assertEquals(dto1, dto2);
        assertNotNull(dto1.toString());
    }
}
