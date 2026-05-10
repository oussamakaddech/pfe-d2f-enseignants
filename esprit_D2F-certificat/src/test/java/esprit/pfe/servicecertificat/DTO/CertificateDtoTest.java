package esprit.pfe.servicecertificat.dto;

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
        res.setTypeCertif("CERTIF");
        res.setDateDebutFormation(LocalDate.of(2026, 1, 1));
        res.setDateFinFormation(LocalDate.of(2026, 1, 31));
        res.setChargeHoraireGlobal(40);
        res.setEnseignantId("E001");

        assertAll("CertificateResponse fields",
            () -> assertEquals(1L, res.getId()),
            () -> assertEquals(10L, res.getFormationId()),
            () -> assertEquals("Java", res.getTitreFormation()),
            () -> assertEquals("CERTIF", res.getTypeCertif()),
            () -> assertEquals(LocalDate.of(2026, 1, 1), res.getDateDebutFormation()),
            () -> assertEquals(LocalDate.of(2026, 1, 31), res.getDateFinFormation()),
            () -> assertEquals(40, res.getChargeHoraireGlobal()),
            () -> assertEquals("E001", res.getEnseignantId()),
            () -> assertTrue(res.isDelivered()),
            () -> assertEquals("Nom", res.getNomEnseignant()),
            () -> assertEquals("Prenom", res.getPrenomEnseignant()),
            () -> assertEquals("mail@test.com", res.getMailEnseignant()),
            () -> assertEquals("Dept", res.getDeptEnseignant()),
            () -> assertEquals("Formateur", res.getRoleEnFormation())
        );
    }

    @Test
    void certificateResponse_shouldBeEqualToItself() {
        CertificateResponse res1 = new CertificateResponse();
        res1.setId(1L);
        res1.setTitreFormation("Test");

        CertificateResponse res2 = new CertificateResponse();
        res2.setId(1L);
        res2.setTitreFormation("Test");

        assertEquals(res1, res2);
        assertEquals(res1.hashCode(), res2.hashCode());
    }

    @Test
    void certificateResponse_toStringShouldContainFields() {
        CertificateResponse res = new CertificateResponse();
        res.setId(1L);
        res.setTitreFormation("Java");

        String str = res.toString();
        assertTrue(str.contains("1"));
        assertTrue(str.contains("Java"));
    }

    @Test
    void certificateResponse_copy() {
        CertificateResponse original = new CertificateResponse();
        original.setId(1L);
        original.setFormationId(10L);
        original.setTitreFormation("Spring");
        original.setTypeCertif("CERTIF");
        original.setDateDebutFormation(LocalDate.of(2026, 1, 1));
        original.setDateFinFormation(LocalDate.of(2026, 1, 31));
        original.setChargeHoraireGlobal(40);
        original.setEnseignantId("E001");
        original.setNomEnseignant("Test");
        original.setPrenomEnseignant("User");
        original.setMailEnseignant("test@esprit.tn");
        original.setDeptEnseignant("INFO");
        original.setRoleEnFormation("FORMATEUR");
        original.setDelivered(false);

        CertificateResponse copy = new CertificateResponse();
        copy.setId(original.getId());
        copy.setFormationId(original.getFormationId());
        copy.setTitreFormation(original.getTitreFormation());
        copy.setTypeCertif(original.getTypeCertif());
        copy.setDateDebutFormation(original.getDateDebutFormation());
        copy.setDateFinFormation(original.getDateFinFormation());
        copy.setChargeHoraireGlobal(original.getChargeHoraireGlobal());
        copy.setEnseignantId(original.getEnseignantId());
        copy.setNomEnseignant(original.getNomEnseignant());
        copy.setPrenomEnseignant(original.getPrenomEnseignant());
        copy.setMailEnseignant(original.getMailEnseignant());
        copy.setDeptEnseignant(original.getDeptEnseignant());
        copy.setRoleEnFormation(original.getRoleEnFormation());
        copy.setDelivered(original.isDelivered());

        assertEquals(1L, copy.getId());
        assertEquals("Spring", copy.getTitreFormation());
        assertEquals("CERTIF", copy.getTypeCertif());
        assertEquals(40, copy.getChargeHoraireGlobal());
        assertFalse(copy.isDelivered());
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
    void certificateBatchMessage_equalsAndHashCode() {
        CertificateBatchMessage msg1 = new CertificateBatchMessage();
        msg1.setFormationId(10L);
        msg1.setTitreFormation("Test");

        CertificateBatchMessage msg2 = new CertificateBatchMessage();
        msg2.setFormationId(10L);
        msg2.setTitreFormation("Test");

        assertEquals(msg1, msg2);
        assertEquals(msg1.hashCode(), msg2.hashCode());
    }

    @Test
    void certificateBatchMessage_toString() {
        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setFormationId(10L);
        msg.setTitreFormation("Test");

        String str = msg.toString();
        assertTrue(str.contains("10"));
        assertTrue(str.contains("Test"));
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

    @Test
    void enseignantPresenceInfo_equalsAndHashCode() {
        CertificateBatchMessage.EnseignantPresenceInfo info1 = new CertificateBatchMessage.EnseignantPresenceInfo();
        info1.setEnseignantId("E001");
        info1.setNom("Test");

        CertificateBatchMessage.EnseignantPresenceInfo info2 = new CertificateBatchMessage.EnseignantPresenceInfo();
        info2.setEnseignantId("E001");
        info2.setNom("Test");

        assertEquals(info1, info2);
        assertEquals(info1.hashCode(), info2.hashCode());
    }

    @Test
    void enseignantPresenceInfo_copy() {
        CertificateBatchMessage.EnseignantPresenceInfo original = new CertificateBatchMessage.EnseignantPresenceInfo();
        original.setEnseignantId("E001");
        original.setNom("Nom");
        original.setPrenom("Prenom");
        original.setMail("test@esprit.tn");
        original.setDeptEnseignantLibelle("INFO");
        original.setRole("FORMATEUR");
        original.setPresent(true);

        CertificateBatchMessage.EnseignantPresenceInfo copy = new CertificateBatchMessage.EnseignantPresenceInfo();
        copy.setEnseignantId(original.getEnseignantId());
        copy.setNom(original.getNom());
        copy.setPrenom(original.getPrenom());
        copy.setMail(original.getMail());
        copy.setDeptEnseignantLibelle(original.getDeptEnseignantLibelle());
        copy.setRole(original.getRole());
        copy.setPresent(original.isPresent());

        assertEquals("E001", copy.getEnseignantId());
        assertEquals("Nom", copy.getNom());
        assertTrue(copy.isPresent());
    }
}
