package esprit.pfe.servicecertificat.services;

import esprit.pfe.servicecertificat.dto.CertificateVerificationResponse;
import esprit.pfe.servicecertificat.entities.Certificate;
import esprit.pfe.servicecertificat.exception.ResourceNotFoundException;
import esprit.pfe.servicecertificat.repositories.CertificateRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.Month;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Tests de la vérification publique des certificats (page de vérification).
 */
@ExtendWith(MockitoExtension.class)
class CertificateVerifyServiceTest {

    @Mock
    private CertificateRepository certificateRepository;

    @InjectMocks
    private CertificateServiceImpl certificateService;

    private Certificate sample() {
        Certificate cert = new Certificate();
        cert.setIdCertificate(1L);
        cert.setCertificateNumber("CERT-2026-000001");
        cert.setNomEnseignant("Doe");
        cert.setPrenomEnseignant("John");
        cert.setTitreFormation("Machine Learning");
        cert.setChargeHoraireGlobal(40);
        cert.setDateDebutFormation(LocalDate.of(2026, Month.JANUARY, 10));
        cert.setDateFinFormation(LocalDate.of(2026, Month.JANUARY, 20));
        cert.setIssuedAt(OffsetDateTime.now());
        cert.setCertificateStatus("ISSUED");
        cert.setCompetencesValidees("AI.ML");
        return cert;
    }

    @Test
    void verify_certificatValide_retourneLaFiche() {
        when(certificateRepository.findByCertificateNumberAndCertificateStatus(
                "CERT-2026-000001", "ISSUED")).thenReturn(Optional.of(sample()));

        CertificateVerificationResponse response = certificateService.verify("CERT-2026-000001");

        assertNotNull(response);
        assertEquals("CERT-2026-000001", response.getCertificateNumber());
        assertEquals("Doe", response.getNomEnseignant());
        assertEquals("John", response.getPrenomEnseignant());
        assertEquals("Machine Learning", response.getTitreFormation());
        assertEquals(40, response.getChargeHoraireGlobal());
        assertEquals("ISSUED", response.getCertificateStatus());
        assertEquals("AI.ML", response.getCompetencesValidees());
    }

    @Test
    void verify_certificatInconnu_leve404() {
        when(certificateRepository.findByCertificateNumberAndCertificateStatus(
                "INCONNU", "ISSUED")).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> certificateService.verify("INCONNU"));
        assertTrue(ex.getMessage().contains("invalide ou révoqué"));
    }
}
