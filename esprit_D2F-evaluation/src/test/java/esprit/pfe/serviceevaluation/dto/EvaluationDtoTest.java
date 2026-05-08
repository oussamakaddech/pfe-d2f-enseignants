package esprit.pfe.serviceevaluation.dto;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class EvaluationDtoTest {

    @Test
    void evaluationFormateurDTO_shouldGetSetAllFields() {
        EvaluationFormateurDTO dto = new EvaluationFormateurDTO();
        dto.setIdEvalParticipant(1L);
        dto.setFormationId(10L);
        dto.setEnseignantId("ens-1");
        dto.setNote(15.5f);
        dto.setSatisfaisant(true);
        dto.setCommentaire("Bon formateur");

        assertEquals(1L, dto.getIdEvalParticipant());
        assertEquals(10L, dto.getFormationId());
        assertEquals("ens-1", dto.getEnseignantId());
        assertEquals(15.5f, dto.getNote());
        assertTrue(dto.isSatisfaisant());
        assertEquals("Bon formateur", dto.getCommentaire());
    }

    @Test
    void evaluationGlobaleDTO_shouldGetSetAllFields() {
        EvaluationGlobaleDTO dto = new EvaluationGlobaleDTO();
        dto.setIdEvalGlobale(1L);
        dto.setFormationId(100L);
        dto.setNoteGlobale(4.5f);
        dto.setCommentaireGeneral("Très bien");
        dto.setRecommandation("Recommandée");
        dto.setDateEvaluation(LocalDate.of(2026, 5, 1));

        assertEquals(1L, dto.getIdEvalGlobale());
        assertEquals(100L, dto.getFormationId());
        assertEquals(4.5f, dto.getNoteGlobale());
        assertEquals("Très bien", dto.getCommentaireGeneral());
        assertEquals("Recommandée", dto.getRecommandation());
        assertEquals(LocalDate.of(2026, 5, 1), dto.getDateEvaluation());
    }

    @Test
    void evaluationGlobaleDTO_builder_shouldWork() {
        EvaluationGlobaleDTO dto = EvaluationGlobaleDTO.builder()
                .idEvalGlobale(2L)
                .formationId(200L)
                .noteGlobale(3.8f)
                .build();

        assertEquals(2L, dto.getIdEvalGlobale());
        assertEquals(200L, dto.getFormationId());
        assertEquals(3.8f, dto.getNoteGlobale());
    }

    @Test
    void evaluationEnseignantDTO_shouldGetSetAllFields() {
        EvaluationEnseignantDTO dto = new EvaluationEnseignantDTO();
        dto.setIdEvalParticipant(1L);
        dto.setEnseignantId("ens-1");
        dto.setNote(16.0f);
        dto.setSatisfaisant(true);
        dto.setCommentaire("Good");

        assertEquals(1L, dto.getIdEvalParticipant());
        assertEquals("ens-1", dto.getEnseignantId());
        assertEquals(16.0f, dto.getNote());
        assertTrue(dto.isSatisfaisant());
    }

    @Test
    void formationDTO_shouldGetSetAllFields() {
        FormationDTO dto = new FormationDTO();
        dto.setIdFormation(1L);
        dto.setTitreFormation("Java");

        assertEquals(1L, dto.getIdFormation());
        assertEquals("Java", dto.getTitreFormation());
    }

    @Test
    void enseignantDTO_shouldGetSetAllFields() {
        EnseignantDTO dto = new EnseignantDTO("ens-1", "Test", "User", "test@mail.com", "Permanent", "INFO", "UP1");

        assertEquals("ens-1", dto.getId());
        assertEquals("Test", dto.getNom());
        assertEquals("User", dto.getPrenom());
    }
}
