package esprit.pfe.servicecertificat.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CertificateBatchMessage - Tests unitaires")
class CertificateBatchMessageTest {

    @Test
    @DisplayName("doit créer un CertificateBatchMessage avec tous les champs")
    void createBatchMessage_WithAllFields() {
        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setFormationId(1L);
        msg.setTitreFormation("Java Formation");
        msg.setTypeCertif("ATTESTATION");
        msg.setDateDebutFormation(LocalDate.of(2026, 1, 1));
        msg.setDateFinFormation(LocalDate.of(2026, 1, 5));
        msg.setChargeHoraireGlobal(40);
        msg.setEnseignants(List.of(createEnseignantInfo()));

        assertThat(msg.getFormationId()).isEqualTo(1L);
        assertThat(msg.getTitreFormation()).isEqualTo("Java Formation");
        assertThat(msg.getTypeCertif()).isEqualTo("ATTESTATION");
        assertThat(msg.getDateDebutFormation()).isEqualTo(LocalDate.of(2026, 1, 1));
        assertThat(msg.getDateFinFormation()).isEqualTo(LocalDate.of(2026, 1, 5));
        assertThat(msg.getChargeHoraireGlobal()).isEqualTo(40);
        assertThat(msg.getEnseignants()).hasSize(1);
    }

    @Test
    @DisplayName("doit créer EnseignantPresenceInfo avec tous les champs")
    void createEnseignantPresenceInfo() {
        CertificateBatchMessage.EnseignantPresenceInfo info = new CertificateBatchMessage.EnseignantPresenceInfo();
        info.setEnseignantId("E001");
        info.setNom("BEN MUSTAPHA");
        info.setPrenom("IBTIHEL");
        info.setMail("ibtihel@esprit.tn");
        info.setRole("ANIMATEUR");
        info.setDeptEnseignantLibelle("INFO");
        info.setPresent(true);

        assertThat(info.getEnseignantId()).isEqualTo("E001");
        assertThat(info.getNom()).isEqualTo("BEN MUSTAPHA");
        assertThat(info.getPrenom()).isEqualTo("IBTIHEL");
        assertThat(info.getMail()).isEqualTo("ibtihel@esprit.tn");
        assertThat(info.getRole()).isEqualTo("ANIMATEUR");
        assertThat(info.getDeptEnseignantLibelle()).isEqualTo("INFO");
        assertThat(info.isPresent()).isTrue();
    }

    @Test
    @DisplayName("EnseignantPresenceInfo avec absent = false ne doit pas être traité")
    void enseignantNotPresent_ShouldBeSkipped() {
        CertificateBatchMessage.EnseignantPresenceInfo info = new CertificateBatchMessage.EnseignantPresenceInfo();
        info.setEnseignantId("E002");
        info.setPresent(false);

        assertThat(info.isPresent()).isFalse();
    }

    @Test
    @DisplayName("doit gérer une liste vide d'enseignants")
    void handleEmptyEnseignantsList() {
        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setFormationId(2L);
        msg.setEnseignants(List.of());

        assertThat(msg.getEnseignants()).isEmpty();
    }

    private CertificateBatchMessage.EnseignantPresenceInfo createEnseignantInfo() {
        CertificateBatchMessage.EnseignantPresenceInfo info = new CertificateBatchMessage.EnseignantPresenceInfo();
        info.setEnseignantId("E001");
        info.setNom("BEN MUSTAPHA");
        info.setPrenom("IBTIHEL");
        info.setMail("ibtihel@esprit.tn");
        info.setRole("ANIMATEUR");
        info.setDeptEnseignantLibelle("INFO");
        info.setPresent(true);
        return info;
    }

    @Test
    @DisplayName("toString doit contenir les informations principales")
    void batchMessageToString() {
        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setFormationId(1L);
        msg.setTitreFormation("Test");
        String str = msg.toString();
        assertThat(str).contains("Test");
    }

    @Test
    @DisplayName("EnseignantPresenceInfo toString")
    void enseignantInfoToString() {
        CertificateBatchMessage.EnseignantPresenceInfo info = new CertificateBatchMessage.EnseignantPresenceInfo();
        info.setNom("Test");
        assertThat(info.toString()).contains("Test");
    }

    @Test
    @DisplayName("equals et hashCode pour EnseignantPresenceInfo")
    void enseignantInfoEqualsHashCode() {
        CertificateBatchMessage.EnseignantPresenceInfo info1 = new CertificateBatchMessage.EnseignantPresenceInfo();
        info1.setEnseignantId("E001");

        CertificateBatchMessage.EnseignantPresenceInfo info2 = new CertificateBatchMessage.EnseignantPresenceInfo();
        info2.setEnseignantId("E001");

        assertThat(info1).isEqualTo(info2)
                .hasSameHashCodeAs(info2);
    }

    @Test
    @DisplayName("equals et hashCode pour CertificateBatchMessage")
    void batchMessageEqualsHashCode() {
        CertificateBatchMessage msg1 = new CertificateBatchMessage();
        msg1.setFormationId(1L);

        CertificateBatchMessage msg2 = new CertificateBatchMessage();
        msg2.setFormationId(1L);

        assertThat(msg1).isEqualTo(msg2)
                .hasSameHashCodeAs(msg2);
    }
}
