package esprit.pfe.servicecertificat.controllers;

import esprit.pfe.servicecertificat.dto.CertificateRequest;
import esprit.pfe.servicecertificat.dto.CertificateResponse;
import esprit.pfe.servicecertificat.entities.Certificate;
import esprit.pfe.servicecertificat.repositories.CertificateRepository;
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
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import static org.mockito.ArgumentMatchers.any;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CertificateControllerTest {

    @Mock
    private CertificateRepository repository;
    @InjectMocks
    private CertificateController controller;

    private Certificate certificate;
    private CertificateRequest request;

    @BeforeEach
    void setUp() {
        certificate = new Certificate();
        certificate.setIdCertificate(1L);
        certificate.setFormationId(10L);
        certificate.setTitreFormation("Java Avancé");
        certificate.setTypeCertif("Participation");
        certificate.setNomEnseignant("Dupont");
        certificate.setPrenomEnseignant("Jean");
        certificate.setMailEnseignant("jean@esprit.tn");
        certificate.setDeptEnseignant("INFO");
        certificate.setRoleEnFormation("Participant");
        certificate.setEnseignantId("ens-1");
        certificate.setDelivered(false);

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
        when(repository.save(any())).thenReturn(certificate);

        var response = controller.createCertificate(request);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Java Avancé", response.getBody().getTitreFormation());
        assertFalse(response.getBody().isDelivered());
    }

    @Test
    void getAll_shouldReturnList() {
        when(repository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(certificate)));

        Page<CertificateResponse> result = controller.getAll(Pageable.unpaged());

        assertEquals(1, result.getContent().size());
        assertEquals("Dupont", result.getContent().get(0).getNomEnseignant());
    }

    @Test
    void getByFormation_shouldReturnFilteredList() {
        when(repository.findByFormationId(10L)).thenReturn(List.of(certificate));

        List<CertificateResponse> result = controller.getByFormation(10L);

        assertEquals(1, result.size());
    }

    @Test
    void deliver_shouldSetDeliveredTrue() {
        when(repository.findById(1L)).thenReturn(Optional.of(certificate));
        certificate.setDelivered(true);
        when(repository.save(any())).thenReturn(certificate);

        var response = controller.deliver(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isDelivered());
    }

    @Test
    void deliver_notFound_shouldThrow() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> controller.deliver(999L));
    }

    @Test
    void updateCertificate_shouldReturnUpdated() {
        when(repository.findById(1L)).thenReturn(Optional.of(certificate));
        when(repository.save(any())).thenReturn(certificate);

        var response = controller.updateCertificate(1L, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(repository).save(any());
    }

    @Test
    void updateCertificate_notFound_shouldThrow() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

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

        when(repository.findByMailEnseignant("jean@esprit.tn")).thenReturn(List.of(certificate));

        List<CertificateResponse> result = controller.getByEmail(mockJwt);

        assertEquals(1, result.size());
        assertEquals("Dupont", result.get(0).getNomEnseignant());
        verify(repository).findByMailEnseignant("jean@esprit.tn");
    }

    @Test
    void getByEmail_noCertificates_shouldReturnEmptyList() {
        Jwt mockJwt = Jwt.withTokenValue("test-token")
                .header("alg", "RS256")
                .claim("email", "unknown@esprit.tn")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                .build();

        when(repository.findByMailEnseignant("unknown@esprit.tn")).thenReturn(List.of());

        List<CertificateResponse> result = controller.getByEmail(mockJwt);

        assertTrue(result.isEmpty());
    }

    @Test
    void deliver_notFound_shouldThrowRuntimeException() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> controller.deliver(999L));
        assertEquals("Certificat introuvable", ex.getMessage());
    }

    @Test
    void updateCertificate_notFound_shouldThrowRuntimeException() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> controller.updateCertificate(999L, request));
        assertEquals("Certificat introuvable", ex.getMessage());
    }

    @Test
    void mapToResponse_shouldMapAllFields() {
        Certificate cert = new Certificate();
        cert.setIdCertificate(1L);
        cert.setFormationId(10L);
        cert.setTitreFormation("Java Avancé");
        cert.setTypeCertif("Participation");
        cert.setDateDebutFormation(java.time.LocalDate.of(2025, 1, 1));
        cert.setDateFinFormation(java.time.LocalDate.of(2025, 1, 31));
        cert.setChargeHoraireGlobal(40);
        cert.setEnseignantId("E001");
        cert.setNomEnseignant("Test");
        cert.setPrenomEnseignant("User");
        cert.setMailEnseignant("test@esprit.tn");
        cert.setDeptEnseignant("INFO");
        cert.setRoleEnFormation("FORMATEUR");
        cert.setDelivered(true);
        cert.setPdfFilePath("/path/to/pdf");

        when(repository.findById(1L)).thenReturn(Optional.of(cert));
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = controller.updateCertificate(1L, request);

        assertNotNull(response.getBody());
        assertEquals(1L, response.getBody().getId());
        assertEquals("Java Avancé", response.getBody().getTitreFormation());
        assertEquals("Participation", response.getBody().getTypeCertif());
        assertTrue(response.getBody().isDelivered());
    }
}
