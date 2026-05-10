package esprit.pfe.servicecertificat.entities;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class CertificateTest {

    @Test
    void certificate_ShouldHaveAllFields() {
        Certificate cert = new Certificate();
        cert.setIdCertificate(1L);
        cert.setFormationId(10L);
        cert.setTitreFormation("Java Training");
        cert.setTypeCertif("ATTESTATION");
        cert.setDateDebutFormation(LocalDate.of(2025, 1, 1));
        cert.setDateFinFormation(LocalDate.of(2025, 1, 5));
        cert.setChargeHoraireGlobal(40);
        cert.setEnseignantId("E001");
        cert.setNomEnseignant("Doe");
        cert.setPrenomEnseignant("John");
        cert.setMailEnseignant("john@esprit.tn");
        cert.setDeptEnseignant("Informatique");
        cert.setRoleEnFormation("ANIMATEUR");
        cert.setDelivered(false);
        cert.setPdfFilePath("/certs/cert.pdf");

        assertEquals(1L, cert.getIdCertificate());
        assertEquals(10L, cert.getFormationId());
        assertEquals("Java Training", cert.getTitreFormation());
        assertEquals("ATTESTATION", cert.getTypeCertif());
        assertEquals(LocalDate.of(2025, 1, 1), cert.getDateDebutFormation());
        assertEquals(LocalDate.of(2025, 1, 5), cert.getDateFinFormation());
        assertEquals(40, cert.getChargeHoraireGlobal());
        assertEquals("E001", cert.getEnseignantId());
        assertEquals("Doe", cert.getNomEnseignant());
        assertEquals("John", cert.getPrenomEnseignant());
        assertEquals("john@esprit.tn", cert.getMailEnseignant());
        assertEquals("Informatique", cert.getDeptEnseignant());
        assertEquals("ANIMATEUR", cert.getRoleEnFormation());
        assertFalse(cert.isDelivered());
        assertEquals("/certs/cert.pdf", cert.getPdfFilePath());
    }

    @Test
    void certificate_DefaultValues() {
        Certificate cert = new Certificate();

        assertNull(cert.getIdCertificate());
        assertNull(cert.getFormationId());
        assertFalse(cert.isDelivered());
    }

    @Test
    void certificate_AllArgsConstructor() {
        Certificate cert = new Certificate(1L, 10L, "Java Training", "ATTESTATION",
                LocalDate.of(2025, 1, 1), LocalDate.of(2025, 1, 5), 40,
                "E001", "Doe", "John", "john@esprit.tn", "Informatique", "ANIMATEUR",
                false, "/certs/cert.pdf");

        assertEquals(1L, cert.getIdCertificate());
        assertEquals("Java Training", cert.getTitreFormation());
        assertEquals("E001", cert.getEnseignantId());
        assertEquals("Doe", cert.getNomEnseignant());
        assertEquals("John", cert.getPrenomEnseignant());
        assertEquals("john@esprit.tn", cert.getMailEnseignant());
        assertEquals("Informatique", cert.getDeptEnseignant());
        assertEquals("ANIMATEUR", cert.getRoleEnFormation());
        assertFalse(cert.isDelivered());
        assertEquals("/certs/cert.pdf", cert.getPdfFilePath());
    }

    @Test
    void certificate_EqualsAndHashCode() {
        Certificate cert1 = new Certificate();
        cert1.setIdCertificate(1L);
        cert1.setTitreFormation("Test");

        Certificate cert2 = new Certificate();
        cert2.setIdCertificate(1L);
        cert2.setTitreFormation("Test");

        assertEquals(cert1, cert2);
        assertEquals(cert1.hashCode(), cert2.hashCode());
    }

    @Test
    void certificate_toString() {
        Certificate cert = new Certificate();
        cert.setIdCertificate(1L);
        cert.setTitreFormation("Java");

        String str = cert.toString();
        assertTrue(str.contains("1"));
        assertTrue(str.contains("Java"));
    }

    @Test
    void certificate_setDelivered() {
        Certificate cert = new Certificate();
        assertFalse(cert.isDelivered());

        cert.setDelivered(true);
        assertTrue(cert.isDelivered());

        cert.setDelivered(false);
        assertFalse(cert.isDelivered());
    }

    @Test
    void certificate_setPdfFilePath() {
        Certificate cert = new Certificate();
        assertNull(cert.getPdfFilePath());

        cert.setPdfFilePath("/certs/new-cert.pdf");
        assertEquals("/certs/new-cert.pdf", cert.getPdfFilePath());
    }

    @Test
    void certificate_copyValues() {
        Certificate original = new Certificate();
        original.setIdCertificate(1L);
        original.setFormationId(10L);
        original.setTitreFormation("Spring");
        original.setTypeCertif("BADGE");
        original.setDateDebutFormation(LocalDate.of(2025, 1, 1));
        original.setDateFinFormation(LocalDate.of(2025, 1, 31));
        original.setChargeHoraireGlobal(40);
        original.setEnseignantId("E001");
        original.setNomEnseignant("Test");
        original.setPrenomEnseignant("User");
        original.setMailEnseignant("test@esprit.tn");
        original.setDeptEnseignant("INFO");
        original.setRoleEnFormation("FORMATEUR");
        original.setDelivered(true);
        original.setPdfFilePath("/pdfs/cert.pdf");

        Certificate copy = new Certificate();
        copy.setIdCertificate(original.getIdCertificate());
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
        copy.setPdfFilePath(original.getPdfFilePath());

        assertEquals(1L, copy.getIdCertificate());
        assertEquals("Spring", copy.getTitreFormation());
        assertEquals("BADGE", copy.getTypeCertif());
        assertEquals(40, copy.getChargeHoraireGlobal());
        assertTrue(copy.isDelivered());
        assertEquals("/pdfs/cert.pdf", copy.getPdfFilePath());
    }

    @Test
    void certificate_noArgsConstructor() {
        Certificate cert = new Certificate();
        assertNull(cert.getIdCertificate());
        assertNull(cert.getFormationId());
        assertNull(cert.getTitreFormation());
        assertFalse(cert.isDelivered());
        assertNull(cert.getPdfFilePath());
    }
}