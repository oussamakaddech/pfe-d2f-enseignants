package esprit.pfe.servicecertificat.controllers;

import esprit.pfe.servicecertificat.dto.CertificateIndicatorDTO;
import esprit.pfe.servicecertificat.dto.CertificateRequest;
import esprit.pfe.servicecertificat.dto.CertificateResponse;
import esprit.pfe.servicecertificat.dto.CertificateRevocationRequest;
import esprit.pfe.servicecertificat.services.CertificateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CertificateControllerTest {

    @Mock
    private CertificateService certificateService;

    @InjectMocks
    private CertificateController controller;

    private CertificateResponse response;
    private CertificateRequest request;

    @BeforeEach
    void setUp() {
        response = new CertificateResponse();
        response.setId(1L);
        response.setFormationId(10L);
        response.setTitreFormation("Java Avancé");
        response.setTypeCertif("Participation");
        response.setNomEnseignant("Dupont");
        response.setPrenomEnseignant("Jean");
        response.setMailEnseignant("jean@esprit.tn");
        response.setDeptEnseignant("INFO");
        response.setRoleEnFormation("Participant");
        response.setEnseignantId("ens-1");
        response.setDelivered(false);

        request = new CertificateRequest();
        request.setFormationId(10L);
        request.setTitreFormation("Java Avancé");
        request.setTypeCertif("Participation");
        request.setNomEnseignant("Dupont");
        request.setPrenomEnseignant("Jean");
        request.setMailEnseignant("jean@esprit.tn");
        request.setDeptEnseignant("INFO");
        request.setRoleEnFormation("Participant");
        request.setEnseignantId("ens-1");
    }

    @Test
    void createCertificate_shouldReturnCreated() {
        when(certificateService.create(any())).thenReturn(response);

        var result = controller.createCertificate(request);

        assertEquals(HttpStatus.CREATED, result.getStatusCode());
        assertNotNull(result.getBody());
        assertEquals("Java Avancé", result.getBody().getTitreFormation());
        assertFalse(result.getBody().isDelivered());
    }

    @Test
    void getAll_shouldReturnList() {
        when(certificateService.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(response)));

        Page<CertificateResponse> page = controller.getAll(Pageable.unpaged());

        assertEquals(1, page.getContent().size());
        assertEquals("Dupont", page.getContent().get(0).getNomEnseignant());
    }

    @Test
    void getByFormation_shouldReturnFilteredList() {
        when(certificateService.findByFormation(eq(10L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(response)));

        Page<CertificateResponse> result = controller.getByFormation(10L, Pageable.unpaged());

        assertEquals(1, result.getContent().size());
    }

    @Test
    void deliver_shouldSetDeliveredTrue() {
        CertificateResponse delivered = new CertificateResponse();
        delivered.setId(1L);
        delivered.setDelivered(true);
        when(certificateService.deliver(1L)).thenReturn(delivered);

        var result = controller.deliver(1L);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertTrue(result.getBody().isDelivered());
    }

    @Test
    void deliver_notFound_shouldThrow() {
        when(certificateService.deliver(999L))
                .thenThrow(new RuntimeException("Certificat introuvable : 999"));

        assertThrows(RuntimeException.class, () -> controller.deliver(999L));
    }

    @Test
    void revoke_shouldReturnRevokedCertificate() {
        CertificateRevocationRequest revocationRequest = new CertificateRevocationRequest();
        revocationRequest.setReason("Fraude détectée");

        CertificateResponse revoked = new CertificateResponse();
        revoked.setId(1L);
        revoked.setCertificateStatus("REVOKED");
        revoked.setRevocationReason("Fraude détectée");

        var mockJwt = Jwt.withTokenValue("test-token")
                .header("alg", "RS256")
                .claim("preferred_username", "admin")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                .build();

        when(certificateService.revoke(1L, "Fraude détectée", "admin")).thenReturn(revoked);

        var result = controller.revoke(1L, revocationRequest, mockJwt);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("REVOKED", result.getBody().getCertificateStatus());
        assertEquals("Fraude détectée", result.getBody().getRevocationReason());
        verify(certificateService).revoke(1L, "Fraude détectée", "admin");
    }

    @Test
    void getIndicators_shouldReturnAggregatedCounts() {
        CertificateIndicatorDTO indicators = CertificateIndicatorDTO.builder()
                .eligibleCount(10L)
                .deliveredCount(6L)
                .pendingCount(3L)
                .revokedCount(1L)
                .build();

        when(certificateService.getIndicators()).thenReturn(indicators);

        var result = controller.getIndicators();

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(10L, result.getBody().getEligibleCount());
        assertEquals(6L, result.getBody().getDeliveredCount());
        assertEquals(3L, result.getBody().getPendingCount());
        assertEquals(1L, result.getBody().getRevokedCount());
    }

    @Test
    void getIndicatorsByFormation_shouldReturnFormationScopedCounts() {
        CertificateIndicatorDTO indicators = CertificateIndicatorDTO.builder()
                .eligibleCount(5L)
                .deliveredCount(4L)
                .pendingCount(1L)
                .revokedCount(0L)
                .build();

        when(certificateService.getIndicatorsByFormation(10L)).thenReturn(indicators);

        var result = controller.getIndicatorsByFormation(10L);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(5L, result.getBody().getEligibleCount());
        verify(certificateService).getIndicatorsByFormation(10L);
    }

    @Test
    void updateCertificate_shouldReturnUpdated() {
        when(certificateService.update(eq(1L), any())).thenReturn(response);

        var result = controller.updateCertificate(1L, request);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(certificateService).update(eq(1L), any());
    }

    @Test
    void updateCertificate_notFound_shouldThrow() {
        when(certificateService.update(eq(999L), any()))
                .thenThrow(new RuntimeException("Certificat introuvable : 999"));

        assertThrows(RuntimeException.class, () -> controller.updateCertificate(999L, request));
    }

    @Test
    void getByEmail_shouldReturnCertificatesForTeacher() {
        Jwt mockJwt = Jwt.withTokenValue("test-token")
                .header("alg", "RS256")
                .claim("email", "jean@esprit.tn")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                .build();

        when(certificateService.findByEmail(eq("jean@esprit.tn"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(response)));

        Page<CertificateResponse> result = controller.getByEmail(mockJwt, Pageable.unpaged());

        assertEquals(1, result.getContent().size());
        assertEquals("Dupont", result.getContent().get(0).getNomEnseignant());
    }

    @Test
    void getByEmail_noCertificates_shouldReturnEmptyList() {
        Jwt mockJwt = Jwt.withTokenValue("test-token")
                .header("alg", "RS256")
                .claim("email", "unknown@esprit.tn")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                .build();

        when(certificateService.findByEmail(eq("unknown@esprit.tn"), any(Pageable.class)))
                .thenReturn(Page.empty());

        assertTrue(controller.getByEmail(mockJwt, Pageable.unpaged()).isEmpty());
    }

    @Test
    void mapToResponse_shouldMapAllFields() {
        CertificateResponse full = new CertificateResponse();
        full.setId(1L);
        full.setFormationId(10L);
        full.setTitreFormation("Java Avancé");
        full.setTypeCertif("Participation");
        full.setDateDebutFormation(LocalDate.of(2025, Month.JANUARY, 1));
        full.setDateFinFormation(LocalDate.of(2025, Month.JANUARY, 31));
        full.setChargeHoraireGlobal(40);
        full.setEnseignantId("E001");
        full.setNomEnseignant("Test");
        full.setPrenomEnseignant("User");
        full.setMailEnseignant("test@esprit.tn");
        full.setDeptEnseignant("INFO");
        full.setRoleEnFormation("FORMATEUR");
        full.setDelivered(true);

        when(certificateService.update(eq(1L), any())).thenReturn(full);

        var result = controller.updateCertificate(1L, request);

        assertNotNull(result.getBody());
        assertEquals(1L, result.getBody().getId());
        assertEquals("Java Avancé", result.getBody().getTitreFormation());
        assertTrue(result.getBody().isDelivered());
    }

    @Test
    void revoke_sansJwt_revokedByNull() {
        CertificateRevocationRequest revocationRequest = new CertificateRevocationRequest();
        revocationRequest.setReason("Erreur");

        CertificateResponse revoked = new CertificateResponse();
        revoked.setId(1L);
        revoked.setCertificateStatus("REVOKED");

        when(certificateService.revoke(eq(1L), eq("Erreur"), isNull())).thenReturn(revoked);

        var result = controller.revoke(1L, revocationRequest, null);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("REVOKED", result.getBody().getCertificateStatus());
    }

    @Test
    void getByEnseignant_shouldReturnPage() {
        when(certificateService.findByEnseignant(eq("ens-1"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(response)));

        var result = controller.getByEnseignant("ens-1", Pageable.unpaged());

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(1, result.getBody().getContent().size());
    }

    @Test
    void verify_shouldReturnVerificationResponse() {
        esprit.pfe.servicecertificat.dto.CertificateVerificationResponse verification =
                new esprit.pfe.servicecertificat.dto.CertificateVerificationResponse();
        verification.setCertificateNumber("CERT-2026-000001");
        when(certificateService.verify("CERT-2026-000001")).thenReturn(verification);

        var result = controller.verify("CERT-2026-000001");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("CERT-2026-000001", result.getBody().getCertificateNumber());
    }
}
