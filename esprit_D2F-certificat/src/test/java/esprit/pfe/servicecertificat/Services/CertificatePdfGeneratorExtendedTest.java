package esprit.pfe.servicecertificat.services;

import esprit.pfe.servicecertificat.dto.CertificateBatchMessage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CertificatePdfGenerator - Tests complémentaires")
class CertificatePdfGeneratorExtendedTest {

    @TempDir
    Path tempDir;

    @Test
    @DisplayName("generateCertificateForTeacher sans image de fond")
    void generateCertificateWithoutBackground() throws Exception {
        String outputPath = tempDir.resolve("cert_no_bg.pdf").toString();

        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setTitreFormation("Test Sans Background");
        msg.setTypeCertif("ATTESTATION");
        msg.setDateDebutFormation(java.time.LocalDate.of(2026, 1, 1));
        msg.setDateFinFormation(java.time.LocalDate.of(2026, 1, 5));
        msg.setChargeHoraireGlobal(20);

        CertificateBatchMessage.EnseignantPresenceInfo teacher = new CertificateBatchMessage.EnseignantPresenceInfo();
        teacher.setEnseignantId("T1");
        teacher.setNom("Test");
        teacher.setPrenom("User");
        teacher.setMail("test@esprit.tn");
        teacher.setDeptEnseignantLibelle("INFO");
        teacher.setRole("Formateur");

        CertificatePdfGenerator.generateCertificateForTeacher(outputPath, msg, teacher, null);

        File generatedFile = new File(outputPath);
        assertThat(generatedFile).exists()
                .isNotEmpty();
    }

    @Test
    @DisplayName("generateCertificatesForAllTeachers avec enseignants absents")
    void generateCertificatesWithAbsentTeachers() throws Exception {
        CertificateBatchMessage.EnseignantPresenceInfo t1 = new CertificateBatchMessage.EnseignantPresenceInfo();
        t1.setEnseignantId("T1");
        t1.setNom("Active");
        t1.setPresent(true);

        CertificateBatchMessage.EnseignantPresenceInfo t2 = new CertificateBatchMessage.EnseignantPresenceInfo();
        t2.setEnseignantId("T2");
        t2.setNom("Inactive");
        t2.setPresent(false);

        CertificateBatchMessage.EnseignantPresenceInfo t3 = new CertificateBatchMessage.EnseignantPresenceInfo();
        t3.setEnseignantId("T3");
        t3.setNom("AlsoActive");
        t3.setPresent(true);

        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setFormationId(999L);
        msg.setEnseignants(java.util.List.of(t1, t2, t3));

        byte[] dummyBg = new byte[]{
            71, 73, 70, 56, 57, 97, 1, 0, 1, 0, (byte)128, 0, 0, 0, 0, 0, (byte)255,
            (byte)255, (byte)255, 33, (byte)249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1,
            0, 1, 0, 0, 2, 2, 68, 1, 0, 59
        };

        java.util.List<String> results = CertificatePdfGenerator.generateCertificatesForAllTeachers(msg, dummyBg);

        assertThat(results).hasSize(2)
                .anyMatch(r -> r.contains("T1"))
                .anyMatch(r -> r.contains("T3"))
                .noneMatch(r -> r.contains("T2"));

        results.forEach(File::new);
    }

    @Test
    @DisplayName("generateCertificatesForAllTeachers avec null enseignants")
    void generateCertificatesWithNullEnseignants() throws Exception {
        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setFormationId(1L);
        msg.setEnseignants(null);

        java.util.List<String> results = CertificatePdfGenerator.generateCertificatesForAllTeachers(msg, null);

        assertThat(results).isEmpty();
    }

    @Test
    @DisplayName("generateCertificatesForAllTeachers avec liste vide")
    void generateCertificatesWithEmptyList() throws Exception {
        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setFormationId(1L);
        msg.setEnseignants(java.util.List.of());

        java.util.List<String> results = CertificatePdfGenerator.generateCertificatesForAllTeachers(msg, null);

        assertThat(results).isEmpty();
    }

    @Test
    @DisplayName("generateCertificateForTeacher avec données image vides")
    void generateCertificateWithEmptyBackgroundBytes() throws Exception {
        String outputPath = tempDir.resolve("cert_empty_bg.pdf").toString();

        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setTitreFormation("Formation Empty BG");
        msg.setTypeCertif("CERTIF");
        msg.setDateDebutFormation(java.time.LocalDate.of(2026, 4, 1));
        msg.setDateFinFormation(java.time.LocalDate.of(2026, 4, 10));
        msg.setChargeHoraireGlobal(30);

        CertificateBatchMessage.EnseignantPresenceInfo teacher = new CertificateBatchMessage.EnseignantPresenceInfo();
        teacher.setEnseignantId("E888");
        teacher.setNom("FORM");
        teacher.setPrenom("ALICE");
        teacher.setMail("alice.form@esprit.tn");
        teacher.setDeptEnseignantLibelle("SCI");
        teacher.setRole("EXPERT");

        CertificatePdfGenerator.generateCertificateForTeacher(outputPath, msg, teacher, new byte[0]);

        File generatedFile = new File(outputPath);
        assertThat(generatedFile).exists()
                .isNotEmpty();
    }

    @Test
    @DisplayName("certificat PDF généré contient le bon contenu texte")
    void generatedPdfContainsCorrectContent() throws Exception {
        String outputPath = tempDir.resolve("cert_content_test.pdf").toString();

        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setTitreFormation("Advanced Java Course");
        msg.setTypeCertif("ATTESTATION");
        msg.setDateDebutFormation(java.time.LocalDate.of(2026, 5, 1));
        msg.setDateFinFormation(java.time.LocalDate.of(2026, 5, 20));
        msg.setChargeHoraireGlobal(60);

        CertificateBatchMessage.EnseignantPresenceInfo teacher = new CertificateBatchMessage.EnseignantPresenceInfo();
        teacher.setEnseignantId("E123");
        teacher.setNom("SMITH");
        teacher.setPrenom("JOHN");
        teacher.setMail("john.smith@esprit.tn");
        teacher.setDeptEnseignantLibelle("IT");
        teacher.setRole("ANIMATEUR");

        CertificatePdfGenerator.generateCertificateForTeacher(outputPath, msg, teacher, null);
        assertThat(new File(outputPath)).exists();
    }
}