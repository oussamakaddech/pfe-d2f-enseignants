package tn.esprit.d2f.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** La durée de la formation est obligatoire (au moins 1 heure). */
class BesoinFormationRequestDureeTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    private static Set<ConstraintViolation<BesoinFormationRequest>> dureeViolations(Integer duree) {
        BesoinFormationRequest request = BesoinFormationRequest.builder()
                .typeBesoin(TypeBesoin.COLLECTIF)
                .titre("Formation de test")
                .dureeFormation(duree)
                .build();
        return validator.validateProperty(request, "dureeFormation");
    }

    @Test
    void dureeAbsente_estRefusee() {
        assertThat(dureeViolations(null))
                .extracting(ConstraintViolation::getMessage)
                .containsExactly("La durée de la formation est obligatoire");
    }

    @Test
    void dureeNulle_estRefusee() {
        assertThat(dureeViolations(0)).hasSize(1);
    }

    @Test
    void dureeValide_estAcceptee() {
        assertThat(dureeViolations(8)).isEmpty();
    }
}
