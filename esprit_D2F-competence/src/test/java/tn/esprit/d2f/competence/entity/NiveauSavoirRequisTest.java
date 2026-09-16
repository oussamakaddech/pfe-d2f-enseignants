package tn.esprit.d2f.competence.entity;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class NiveauSavoirRequisTest {

    @Test
    void isSingleRef_WithCompetenceOnly_ReturnsTrue() {
        NiveauSavoirRequis requis = new NiveauSavoirRequis();
        requis.setCompetence(new Competence());
        requis.setSousCompetence(null);
        assertThat(requis.isSingleRef()).isTrue();
    }

    @Test
    void isSingleRef_WithSousCompetenceOnly_ReturnsTrue() {
        NiveauSavoirRequis requis = new NiveauSavoirRequis();
        requis.setCompetence(null);
        requis.setSousCompetence(new SousCompetence());
        assertThat(requis.isSingleRef()).isTrue();
    }

    @Test
    void isSingleRef_WithBoth_ReturnsFalse() {
        NiveauSavoirRequis requis = new NiveauSavoirRequis();
        requis.setCompetence(new Competence());
        requis.setSousCompetence(new SousCompetence());
        assertThat(requis.isSingleRef()).isFalse();
    }

    @Test
    void isSingleRef_WithNeither_ReturnsFalse() {
        NiveauSavoirRequis requis = new NiveauSavoirRequis();
        requis.setCompetence(null);
        requis.setSousCompetence(null);
        assertThat(requis.isSingleRef()).isFalse();
    }
}
