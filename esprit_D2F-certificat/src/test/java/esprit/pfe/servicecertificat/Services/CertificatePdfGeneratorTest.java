package esprit.pfe.servicecertificat.services;

import esprit.pfe.servicecertificat.dto.CertificateBatchMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CertificatePdfGeneratorTest {

    @TempDir
    Path tempDir;

    @Test
    void testGenerateCertificateForTeacher() throws Exception {
        String outputPath = tempDir.resolve("test_cert.pdf").toString();
        
        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setTitreFormation("Java Spring Boot");
        msg.setTypeCertif("Completion");
        msg.setDateDebutFormation(LocalDate.of(2026, 1, 1));
        msg.setDateFinFormation(LocalDate.of(2026, 1, 5));
        msg.setChargeHoraireGlobal(20);
        msg.setFormationId(1L);

        CertificateBatchMessage.EnseignantPresenceInfo teacher = new CertificateBatchMessage.EnseignantPresenceInfo();
        teacher.setEnseignantId("T1");
        teacher.setNom("Doe");
        teacher.setPrenom("John");
        teacher.setMail("john.doe@esprit.tn");
        teacher.setDeptEnseignantLibelle("Informatique");
        teacher.setRole("Formateur");

        // Use a small valid dummy image or null
        byte[] dummyBg = new byte[0]; 

        CertificatePdfGenerator.generateCertificateForTeacher(outputPath, msg, teacher, dummyBg);

        File generatedFile = new File(outputPath);
        assertTrue(generatedFile.exists());
        assertTrue(generatedFile.length() > 0);
    }

    @Test
    void testGenerateCertificatesForAllTeachers() throws Exception {
        CertificateBatchMessage.EnseignantPresenceInfo t1 = new CertificateBatchMessage.EnseignantPresenceInfo();
        t1.setEnseignantId("T1");
        t1.setPresent(true);
        
        CertificateBatchMessage.EnseignantPresenceInfo t2 = new CertificateBatchMessage.EnseignantPresenceInfo();
        t2.setEnseignantId("T2");
        t2.setPresent(false);

        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setFormationId(123L);
        msg.setEnseignants(List.of(t1, t2));

        List<String> results = CertificatePdfGenerator.generateCertificatesForAllTeachers(msg, null);

        assertEquals(1, results.size());
        assertTrue(results.get(0).contains("123_T1"));
        
        // Cleanup generated file in current directory (since the static method doesn't take a path)
        new File(results.get(0)).delete();
    }
}
