package esprit.pfe.servicecertificat.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CertificateRequest - Tests unitaires")
class CertificateRequestTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    @DisplayName("doit valider un CertificateRequest valide")
    void validCertificateRequest() {
        CertificateRequest request = createValidRequest();
        Set<ConstraintViolation<CertificateRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("ne doit pas valider quand formationId est null")
    void invalid_WhenFormationIdNull() {
        CertificateRequest request = createValidRequest();
        request.setFormationId(null);
        Set<ConstraintViolation<CertificateRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
    }

    @Test
    @DisplayName("ne doit pas valider quand titreFormation est blank")
    void invalid_WhenTitreFormationBlank() {
        CertificateRequest request = createValidRequest();
        request.setTitreFormation("");
        Set<ConstraintViolation<CertificateRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
    }

    @Test
    @DisplayName("ne doit pas valider quand email est invalide")
    void invalid_WhenEmailInvalid() {
        CertificateRequest request = createValidRequest();
        request.setMailEnseignant("invalid-email");
        Set<ConstraintViolation<CertificateRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
    }

    @Test
    @DisplayName("ne doit pas valider quand chargeHoraireGlobal est < 1")
    void invalid_WhenChargeHoraireTooLow() {
        CertificateRequest request = createValidRequest();
        request.setChargeHoraireGlobal(0);
        Set<ConstraintViolation<CertificateRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
    }

    @Test
    @DisplayName("doit accepter une adresse email valide")
    void validEmail() {
        CertificateRequest request = createValidRequest();
        request.setMailEnseignant("test@esprit.tn");
        Set<ConstraintViolation<CertificateRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    private CertificateRequest createValidRequest() {
        CertificateRequest request = new CertificateRequest();
        request.setFormationId(1L);
        request.setTitreFormation("Java Formation");
        request.setTypeCertif("ATTESTATION");
        request.setDateDebutFormation(LocalDate.of(2026, 1, 1));
        request.setDateFinFormation(LocalDate.of(2026, 1, 5));
        request.setChargeHoraireGlobal(40);
        request.setEnseignantId("E001");
        request.setNomEnseignant("BEN MUSTAPHA");
        request.setPrenomEnseignant("IBTIHEL");
        request.setMailEnseignant("ibtihel@esprit.tn");
        request.setDeptEnseignant("INFO");
        request.setRoleEnFormation("ANIMATEUR");
        return request;
    }

    @Test
    @DisplayName("CertificateRequest equals and hashCode")
    void equalsAndHashCode() {
        CertificateRequest req1 = createValidRequest();
        CertificateRequest req2 = createValidRequest();
        assertThat(req1)
                .isEqualTo(req2)
                .hasSameHashCodeAs(req2);
    }

    @Test
    @DisplayName("CertificateRequest toString")
    void toStringTest() {
        CertificateRequest req = createValidRequest();
        String str = req.toString();
        assertThat(str)
                .contains("Java Formation")
                .contains("ATTESTATION");
    }

    @Test
    @DisplayName("ne doit pas valider quand mailEnseignant est null")
    void invalid_WhenMailNull() {
        CertificateRequest request = createValidRequest();
        request.setMailEnseignant(null);
        Set<ConstraintViolation<CertificateRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
    }

    @Test
    @DisplayName("ne doit pas valider quand chargeHoraireGlobal est négatif")
    void invalid_WhenChargeHoraireNegative() {
        CertificateRequest request = createValidRequest();
        request.setChargeHoraireGlobal(-5);
        Set<ConstraintViolation<CertificateRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
    }

    @Test
    @DisplayName("doit valider avec valeurs limites de charge horaire")
    void valid_WhenChargeHoraireAtBoundaries() {
        CertificateRequest request = createValidRequest();
        request.setChargeHoraireGlobal(1);
        Set<ConstraintViolation<CertificateRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("ne doit pas valider quand dateFinFormation est avant dateDebutFormation")
    void invalid_WhenDateFinBeforeDateDebut() {
        CertificateRequest request = createValidRequest();
        request.setDateDebutFormation(LocalDate.of(2026, 1, 10));
        request.setDateFinFormation(LocalDate.of(2026, 1, 5));
        Set<ConstraintViolation<CertificateRequest>> violations = validator.validate(request);
        assertThat(violations)
                .isNotEmpty()
                .anyMatch(v -> v.getMessage().contains("posterieure ou egale"));
    }

    @Test
    @DisplayName("isDateRangeValid doit retourner true si une des dates est null")
    void validDateRange_WhenDatesAreNull() {
        CertificateRequest request = new CertificateRequest();
        // dateDebutFormation = null, dateFinFormation = null
        assertThat(request.isDateRangeValid()).isTrue();
        
        request.setDateDebutFormation(LocalDate.of(2026, 1, 1));
        assertThat(request.isDateRangeValid()).isTrue();
        
        request.setDateDebutFormation(null);
        request.setDateFinFormation(LocalDate.of(2026, 1, 1));
        assertThat(request.isDateRangeValid()).isTrue();
    }
}
