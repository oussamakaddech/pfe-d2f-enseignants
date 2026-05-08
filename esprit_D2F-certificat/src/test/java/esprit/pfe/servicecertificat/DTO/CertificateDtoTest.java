package esprit.pfe.servicecertificat.DTO;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class CertificateDtoTest {

    @Test
    void certificateRequest_shouldGetSetAllFields() {
        CertificateRequest req = new CertificateRequest();
        req.setFormationId(10L);
        req.setTitreFormation("Spring Boot");
        req.setTypeCertif("Participation");
        req.setDateDebutFormation(LocalDate.of(2026, 1, 1));
        req.setDateFinFormation(LocalDate.of(2026, 1, 5));
        req.setChargeHoraireGlobal(40);
        req.setEnseignantId("ens-1");
        req.setNomEnseignant("Test");
        req.setPrenomEnseignant("User");
        req.setMailEnseignant("test@esprit.tn");
        req.setDeptEnseignant("INFO");
        req.setRoleEnFormation("Participant");

        assertEquals(10L, req.getFormationId());
        assertEquals("Spring Boot", req.getTitreFormation());
        assertEquals("Participation", req.getTypeCertif());
        assertEquals(LocalDate.of(2026, 1, 1), req.getDateDebutFormation());
        assertEquals(LocalDate.of(2026, 1, 5), req.getDateFinFormation());
        assertEquals(40, req.getChargeHoraireGlobal());
        assertEquals("ens-1", req.getEnseignantId());
        assertEquals("Test", req.getNomEnseignant());
        assertEquals("User", req.getPrenomEnseignant());
        assertEquals("test@esprit.tn", req.getMailEnseignant());
        assertEquals("INFO", req.getDeptEnseignant());
        assertEquals("Participant", req.getRoleEnFormation());
    }

    @Test
    void certificateResponse_shouldGetSetAllFields() {
        CertificateResponse res = new CertificateResponse();
        res.setId(1L);
        res.setFormationId(10L);
        res.setTitreFormation("Java");
        res.setDelivered(true);
        res.setNomEnseignant("Nom");
        res.setPrenomEnseignant("Prenom");
        res.setMailEnseignant("mail@test.com");
        res.setDeptEnseignant("Dept");
        res.setRoleEnFormation("Formateur");

        assertEquals(1L, res.getId());
        assertEquals(10L, res.getFormationId());
        assertEquals("Java", res.getTitreFormation());
        assertTrue(res.isDelivered());
        assertEquals("Nom", res.getNomEnseignant());
    }

    @Test
    void certificateBatchMessage_shouldGetSetFields() {
        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setFormationId(10L);
        msg.setTitreFormation("Test");
        msg.setTypeCertif("Participation");
        msg.setDateDebutFormation(LocalDate.of(2026, 1, 1));
        msg.setDateFinFormation(LocalDate.of(2026, 1, 5));
        msg.setChargeHoraireGlobal(20);

        assertEquals(10L, msg.getFormationId());
        assertEquals("Test", msg.getTitreFormation());
        assertEquals("Participation", msg.getTypeCertif());
        assertEquals(LocalDate.of(2026, 1, 1), msg.getDateDebutFormation());
    }

    @Test
    void enseignantPresenceInfo_shouldGetSetFields() {
        CertificateBatchMessage.EnseignantPresenceInfo info = new CertificateBatchMessage.EnseignantPresenceInfo();
        info.setEnseignantId("ens-1");
        info.setNom("Nom");
        info.setPrenom("Prenom");
        info.setMail("mail@test.com");
        info.setDeptEnseignantLibelle("INFO");
        info.setRole("Participant");
        info.setPresent(true);

        assertEquals("ens-1", info.getEnseignantId());
        assertEquals("Nom", info.getNom());
        assertTrue(info.isPresent());
    }
}
