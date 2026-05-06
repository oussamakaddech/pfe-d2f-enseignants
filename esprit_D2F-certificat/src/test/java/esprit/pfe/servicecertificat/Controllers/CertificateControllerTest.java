package esprit.pfe.servicecertificat.Controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import esprit.pfe.servicecertificat.DTO.CertificateRequest;
import esprit.pfe.servicecertificat.Entities.Certificate;
import esprit.pfe.servicecertificat.Repositories.CertificateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("CertificateController - Tests d'intégration")
class CertificateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CertificateRepository certificateRepository;

    private CertificateRequest validRequest;
    private Certificate savedEntity;

    @BeforeEach
    void setUp() {
        validRequest = new CertificateRequest();
        validRequest.setFormationId(1L);
        validRequest.setTitreFormation("Spring Boot Avancé");
        validRequest.setTypeCertif("ATTESTATION");
        validRequest.setDateDebutFormation(LocalDate.now());
        validRequest.setDateFinFormation(LocalDate.now());
        validRequest.setChargeHoraireGlobal(40);
        validRequest.setEnseignantId("ENS001");
        validRequest.setNomEnseignant("Dupont");
        validRequest.setPrenomEnseignant("Jean");
        validRequest.setMailEnseignant("jean.dupont@esprit.tn");
        validRequest.setRoleEnFormation("ANIMATEUR");

        savedEntity = new Certificate();
        savedEntity.setIdCertificate(1L);
        savedEntity.setFormationId(1L);
        savedEntity.setTitreFormation("Spring Boot Avancé");
        savedEntity.setTypeCertif("ATTESTATION");
        savedEntity.setDateDebutFormation(LocalDate.now());
        savedEntity.setDateFinFormation(LocalDate.now());
        savedEntity.setChargeHoraireGlobal(40);
        savedEntity.setEnseignantId("ENS001");
        savedEntity.setNomEnseignant("Dupont");
        savedEntity.setPrenomEnseignant("Jean");
        savedEntity.setMailEnseignant("jean.dupont@esprit.tn");
        savedEntity.setRoleEnFormation("ANIMATEUR");
        savedEntity.setDelivered(false);
    }

    @Nested
    @DisplayName("POST /api/v1/certificates")
    class CreateCertificate {

        @Test
        @DisplayName("201 - Création réussie avec des données valides")
        @WithMockUser(roles = "ADMIN")
        void shouldCreateCertificate() throws Exception {
            when(certificateRepository.save(any(Certificate.class))).thenReturn(savedEntity);

            mockMvc.perform(post("/api/v1/certificates")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.titreFormation").value("Spring Boot Avancé"))
                    .andExpect(jsonPath("$.delivered").value(false));
        }

        @Test
        @DisplayName("400 - Validation : titre manquant")
        @WithMockUser(roles = "ADMIN")
        void shouldRejectMissingTitle() throws Exception {
            validRequest.setTitreFormation(null);

            mockMvc.perform(post("/api/v1/certificates")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 - Validation : email invalide")
        @WithMockUser(roles = "ADMIN")
        void shouldRejectInvalidEmail() throws Exception {
            validRequest.setMailEnseignant("not-an-email");

            mockMvc.perform(post("/api/v1/certificates")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 - Validation : chargeHoraire < 1")
        @WithMockUser(roles = "ADMIN")
        void shouldRejectZeroChargeHoraire() throws Exception {
            validRequest.setChargeHoraireGlobal(0);

            mockMvc.perform(post("/api/v1/certificates")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("GET /api/v1/certificates")
    class GetCertificates {

        @Test
        @DisplayName("200 - Liste tous les certificats")
        @WithMockUser(roles = "USER")
        void shouldReturnAllCertificates() throws Exception {
            when(certificateRepository.findAll()).thenReturn(List.of(savedEntity));

            mockMvc.perform(get("/api/v1/certificates"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].titreFormation").value("Spring Boot Avancé"));
        }

        @Test
        @DisplayName("200 - Certificats par formation")
        @WithMockUser(roles = "USER")
        void shouldReturnByFormation() throws Exception {
            when(certificateRepository.findByFormationId(1L)).thenReturn(List.of(savedEntity));

            mockMvc.perform(get("/api/v1/certificates/formation/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].enseignantId").value("ENS001"));
        }
    }

    @Nested
    @DisplayName("Sécurité RBAC")
    class Security {

        @Test
        @DisplayName("401 - Accès non authentifié refusé")
        void shouldRejectUnauthenticated() throws Exception {
            mockMvc.perform(get("/api/v1/certificates"))
                    .andExpect(status().isUnauthorized());
        }
    }
}
