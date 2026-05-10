package esprit.pfe.servicecertificat.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CertificateResponse - Tests unitaires")
class CertificateResponseTest {

    @Test
    @DisplayName("doit créer CertificateResponse avec tous les champs")
    void createResponse_WithAllFields() {
        CertificateResponse response = new CertificateResponse();
        response.setId(1L);
        response.setFormationId(10L);
        response.setTitreFormation("Java Formation");
        response.setTypeCertif("ATTESTATION");
        response.setDateDebutFormation(LocalDate.of(2026, 1, 1));
        response.setDateFinFormation(LocalDate.of(2026, 1, 5));
        response.setChargeHoraireGlobal(40);
        response.setEnseignantId("E001");
        response.setNomEnseignant("BEN MUSTAPHA");
        response.setPrenomEnseignant("IBTIHEL");
        response.setMailEnseignant("ibtihel@esprit.tn");
        response.setDeptEnseignant("INFO");
        response.setRoleEnFormation("ANIMATEUR");
        response.setDelivered(true);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getFormationId()).isEqualTo(10L);
        assertThat(response.getTitreFormation()).isEqualTo("Java Formation");
        assertThat(response.getTypeCertif()).isEqualTo("ATTESTATION");
        assertThat(response.getDateDebutFormation()).isEqualTo(LocalDate.of(2026, 1, 1));
        assertThat(response.getDateFinFormation()).isEqualTo(LocalDate.of(2026, 1, 5));
        assertThat(response.getChargeHoraireGlobal()).isEqualTo(40);
        assertThat(response.getEnseignantId()).isEqualTo("E001");
        assertThat(response.getNomEnseignant()).isEqualTo("BEN MUSTAPHA");
        assertThat(response.getPrenomEnseignant()).isEqualTo("IBTIHEL");
        assertThat(response.getMailEnseignant()).isEqualTo("ibtihel@esprit.tn");
        assertThat(response.getDeptEnseignant()).isEqualTo("INFO");
        assertThat(response.getRoleEnFormation()).isEqualTo("ANIMATEUR");
        assertThat(response.isDelivered()).isTrue();
    }

    @Test
    @DisplayName("doit créer CertificateResponse avec constructeur par défaut")
    void createResponse_DefaultConstructor() {
        CertificateResponse response = new CertificateResponse();

        assertThat(response.getId()).isNull();
        assertThat(response.getFormationId()).isNull();
        assertThat(response.getTitreFormation()).isNull();
        assertThat(response.isDelivered()).isFalse();
    }

    @Test
    @DisplayName("toString doit contenir tous les champs")
    void toString_ShouldContainFields() {
        CertificateResponse response = new CertificateResponse();
        response.setTitreFormation("Test");

        String str = response.toString();
        assertThat(str).contains("Test");
    }

    @Test
    @DisplayName("setDelivered doit mettre à jour l'état")
    void setDelivered() {
        CertificateResponse response = new CertificateResponse();
        assertThat(response.isDelivered()).isFalse();

        response.setDelivered(true);
        assertThat(response.isDelivered()).isTrue();
    }

    @Test
    @DisplayName("equals et hashCode")
    void equalsAndHashCode() {
        CertificateResponse r1 = new CertificateResponse();
        r1.setId(1L);
        r1.setTitreFormation("Test");

        CertificateResponse r2 = new CertificateResponse();
        r2.setId(1L);
        r2.setTitreFormation("Test");

        assertThat(r1).isEqualTo(r2)
                .hasSameHashCodeAs(r2);
    }
}