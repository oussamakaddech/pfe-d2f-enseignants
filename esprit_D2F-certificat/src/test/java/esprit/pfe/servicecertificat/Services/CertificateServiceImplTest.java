package esprit.pfe.servicecertificat.services;

import esprit.pfe.servicecertificat.dto.CertificateRequest;
import esprit.pfe.servicecertificat.dto.CertificateResponse;
import esprit.pfe.servicecertificat.entities.Certificate;
import esprit.pfe.servicecertificat.exception.ResourceNotFoundException;
import esprit.pfe.servicecertificat.repositories.CertificateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CertificateServiceImpl - Tests unitaires")
class CertificateServiceImplTest {

    @Mock
    private CertificateRepository certificateRepository;

    @InjectMocks
    private CertificateServiceImpl certificateService;

    private CertificateRequest request;
    private Certificate certificate;

    @BeforeEach
    void setUp() {
        request = new CertificateRequest();
        request.setFormationId(1L);
        request.setTitreFormation("Spring Boot");
        request.setTypeCertif("CERTIF");
        request.setDateDebutFormation(LocalDate.now());
        request.setDateFinFormation(LocalDate.now().plusDays(2));
        request.setChargeHoraireGlobal(20);
        request.setEnseignantId("ENS1");
        request.setNomEnseignant("Doe");
        request.setPrenomEnseignant("John");
        request.setMailEnseignant("john.doe@test.com");
        request.setDeptEnseignant("INFO");
        request.setRoleEnFormation("PARTICIPANT");

        certificate = new Certificate();
        certificate.setIdCertificate(100L);
        certificate.setFormationId(1L);
        certificate.setTitreFormation("Spring Boot");
        certificate.setTypeCertif("CERTIF");
        certificate.setDelivered(false);
        certificate.setEnseignantId("ENS1");
        certificate.setNomEnseignant("Doe");
        certificate.setPrenomEnseignant("John");
        certificate.setMailEnseignant("john.doe@test.com");

    }

    @Test
    @DisplayName("create - devrait créer et retourner un CertificateResponse")
    void create() {
        when(certificateRepository.save(any(Certificate.class))).thenReturn(certificate);

        CertificateResponse response = certificateService.create(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getTitreFormation()).isEqualTo("Spring Boot");
        verify(certificateRepository, times(1)).save(any(Certificate.class));
    }

    @Test
    @DisplayName("findAll - devrait retourner une page de CertificateResponse")
    void findAll() {
        Page<Certificate> page = new PageImpl<>(List.of(certificate));
        when(certificateRepository.findAll(any(PageRequest.class))).thenReturn(page);

        Page<CertificateResponse> result = certificateService.findAll(PageRequest.of(0, 10));

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo(100L);
    }

    @Test
    @DisplayName("findByFormation - devrait retourner une liste de CertificateResponse")
    void findByFormation() {
        when(certificateRepository.findByFormationId(1L)).thenReturn(List.of(certificate));

        List<CertificateResponse> result = certificateService.findByFormation(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitreFormation()).isEqualTo("Spring Boot");
    }

    @Test
    @DisplayName("deliver - devrait marquer le certificat comme délivré")
    void deliver() {
        when(certificateRepository.findById(100L)).thenReturn(Optional.of(certificate));
        when(certificateRepository.save(any(Certificate.class))).thenAnswer(inv -> inv.getArgument(0));

        CertificateResponse response = certificateService.deliver(100L);

        assertThat(response.isDelivered()).isTrue();
        verify(certificateRepository).save(certificate);
    }

    @Test
    @DisplayName("deliver - devrait lever une exception si introuvable")
    void deliver_NotFound() {
        when(certificateRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> certificateService.deliver(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("introuvable");
    }

    @Test
    @DisplayName("findByEmail - devrait retourner des certificats")
    void findByEmail() {
        when(certificateRepository.findByMailEnseignant("john.doe@test.com")).thenReturn(List.of(certificate));

        List<CertificateResponse> result = certificateService.findByEmail("john.doe@test.com");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getMailEnseignant()).isEqualTo("john.doe@test.com");
    }

    @Test
    @DisplayName("findByEnseignant - devrait retourner des certificats")
    void findByEnseignant() {
        when(certificateRepository.findByEnseignantId("ENS1")).thenReturn(List.of(certificate));

        List<CertificateResponse> result = certificateService.findByEnseignant("ENS1");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEnseignantId()).isEqualTo("ENS1");
    }

    @Test
    @DisplayName("update - devrait mettre à jour le certificat")
    void update() {
        when(certificateRepository.findById(100L)).thenReturn(Optional.of(certificate));
        when(certificateRepository.save(any(Certificate.class))).thenAnswer(inv -> inv.getArgument(0));

        request.setTitreFormation("Angular");
        CertificateResponse response = certificateService.update(100L, request);

        assertThat(response.getTitreFormation()).isEqualTo("Angular");
        verify(certificateRepository).save(certificate);
    }

    @Test
    @DisplayName("update - devrait lever une exception si introuvable")
    void update_NotFound() {
        when(certificateRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> certificateService.update(99L, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("introuvable");
    }

    @Test
    @DisplayName("findByFormation avec pagination - devrait retourner une page de certificats (offset < size)")
    void findByFormation_Paginated_OffsetLessThanSize() {
        when(certificateRepository.findByFormationId(1L)).thenReturn(List.of(certificate));

        Page<CertificateResponse> result = certificateService.findByFormation(1L, PageRequest.of(0, 10));

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo(100L);
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("findByFormation avec pagination - devrait retourner une page vide (offset >= size)")
    void findByFormation_Paginated_OffsetGreaterThanOrEqualSize() {
        when(certificateRepository.findByFormationId(1L)).thenReturn(List.of(certificate));

        Page<CertificateResponse> result = certificateService.findByFormation(1L, PageRequest.of(1, 10));

        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("findByEmail avec pagination - devrait retourner une page de certificats (offset < size)")
    void findByEmail_Paginated_OffsetLessThanSize() {
        when(certificateRepository.findByMailEnseignant("john.doe@test.com")).thenReturn(List.of(certificate));

        Page<CertificateResponse> result = certificateService.findByEmail("john.doe@test.com", PageRequest.of(0, 10));

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("findByEmail avec pagination - devrait retourner une page vide (offset >= size)")
    void findByEmail_Paginated_OffsetGreaterThanOrEqualSize() {
        when(certificateRepository.findByMailEnseignant("john.doe@test.com")).thenReturn(List.of(certificate));

        Page<CertificateResponse> result = certificateService.findByEmail("john.doe@test.com", PageRequest.of(1, 10));

        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("findByEnseignant avec pagination - devrait retourner une page de certificats (offset < size)")
    void findByEnseignant_Paginated_OffsetLessThanSize() {
        when(certificateRepository.findByEnseignantId("ENS1")).thenReturn(List.of(certificate));

        Page<CertificateResponse> result = certificateService.findByEnseignant("ENS1", PageRequest.of(0, 10));

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("findByEnseignant avec pagination - devrait retourner une page vide (offset >= size)")
    void findByEnseignant_Paginated_OffsetGreaterThanOrEqualSize() {
        when(certificateRepository.findByEnseignantId("ENS1")).thenReturn(List.of(certificate));

        Page<CertificateResponse> result = certificateService.findByEnseignant("ENS1", PageRequest.of(1, 10));

        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalElements()).isEqualTo(1);
    }
}
