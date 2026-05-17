package esprit.pfe.servicecertificat.controllers;

import esprit.pfe.servicecertificat.dto.CertificateRequest;
import esprit.pfe.servicecertificat.dto.CertificateResponse;
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
        when(certificateService.findByFormation(10L)).thenReturn(List.of(response));

        List<CertificateResponse> result = controller.getByFormation(10L);

        assertEquals(1, result.size());
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

        when(certificateService.findByEmail("jean@esprit.tn")).thenReturn(List.of(response));

        List<CertificateResponse> result = controller.getByEmail(mockJwt);

        assertEquals(1, result.size());
        assertEquals("Dupont", result.get(0).getNomEnseignant());
    }

    @Test
    void getByEmail_noCertificates_shouldReturnEmptyList() {
        Jwt mockJwt = Jwt.withTokenValue("test-token")
                .header("alg", "RS256")
                .claim("email", "unknown@esprit.tn")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                .build();

        when(certificateService.findByEmail("unknown@esprit.tn")).thenReturn(List.of());

        assertTrue(controller.getByEmail(mockJwt).isEmpty());
    }

    @Test
    void mapToResponse_shouldMapAllFields() {
        CertificateResponse full = new CertificateResponse();
        full.setId(1L);
        full.setFormationId(10L);
        full.setTitreFormation("Java Avancé");
        full.setTypeCertif("Participation");
        full.setDateDebutFormation(LocalDate.of(2025, 1, 1));
        full.setDateFinFormation(LocalDate.of(2025, 1, 31));
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
}
