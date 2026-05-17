package tn.esprit.d2f.competence.dto;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class NiveauSavoirRequisRequestTest {

    @Test
    void isValidParent_WithCompetenceOnly_ReturnsTrue() {
        NiveauSavoirRequisRequest request = new NiveauSavoirRequisRequest();
        request.setCompetenceId(1L);
        request.setSousCompetenceId(null);
        assertThat(request.isValidParent()).isTrue();
    }

    @Test
    void isValidParent_WithSousCompetenceOnly_ReturnsTrue() {
        NiveauSavoirRequisRequest request = new NiveauSavoirRequisRequest();
        request.setCompetenceId(null);
        request.setSousCompetenceId(2L);
        assertThat(request.isValidParent()).isTrue();
    }

    @Test
    void isValidParent_WithBoth_ReturnsFalse() {
        NiveauSavoirRequisRequest request = new NiveauSavoirRequisRequest();
        request.setCompetenceId(1L);
        request.setSousCompetenceId(2L);
        assertThat(request.isValidParent()).isFalse();
    }

    @Test
    void isValidParent_WithNeither_ReturnsFalse() {
        NiveauSavoirRequisRequest request = new NiveauSavoirRequisRequest();
        request.setCompetenceId(null);
        request.setSousCompetenceId(null);
        assertThat(request.isValidParent()).isFalse();
    }
}
