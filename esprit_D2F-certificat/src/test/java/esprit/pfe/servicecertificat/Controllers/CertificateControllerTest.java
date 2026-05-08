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
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

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
        when(repository.findAll()).thenReturn(List.of(certificate));

        List<CertificateResponse> result = controller.getAll();

        assertEquals(1, result.size());
        assertEquals("Dupont", result.get(0).getNomEnseignant());
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
}
