package tn.esprit.d2f.competence.entity;

import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import static org.assertj.core.api.Assertions.assertThat;

class EnseignantCompetenceTest {

    @Test
    void prePersist_ShouldSetDateAcquisitionIfNotSet() {
        EnseignantCompetence ec = new EnseignantCompetence();
        ec.setDateAcquisition(null);
        ec.prePersist();
        assertThat(ec.getDateAcquisition()).isNotNull();
        assertThat(ec.getDateAcquisition()).isEqualTo(LocalDate.now());
    }

    @Test
    void prePersist_ShouldNotOverrideExistingDateAcquisition() {
        EnseignantCompetence ec = new EnseignantCompetence();
        LocalDate pastDate = LocalDate.of(2020, 1, 1);
        ec.setDateAcquisition(pastDate);
        ec.prePersist();
        assertThat(ec.getDateAcquisition()).isEqualTo(pastDate);
    }
}
