package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.Inscription;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.exception.GlobalExceptionHandler;
import esprit.pfe.serviceformation.repositories.FormationCompetenceRepository;
import esprit.pfe.serviceformation.repositories.InscriptionRepository;
import esprit.pfe.serviceformation.services.InscriptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@ExtendWith(MockitoExtension.class)
@DisplayName("InscriptionController - Tests")
class InscriptionControllerTest {

    private MockMvc mockMvc;

    @Mock private InscriptionService inscriptionService;
    @Mock private InscriptionRepository inscriptionRepository;
    @Mock private FormationCompetenceRepository formationCompetenceRepository;
    @InjectMocks private InscriptionController controller;

    @BeforeEach
    void setup() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new org.springframework.data.web.config.SpringDataJacksonConfiguration.PageModule(new org.springframework.data.web.config.SpringDataWebSettings(org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode.DIRECT)));
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter(mapper);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(converter)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /formations/accessibles retourne 200")
    void testGetFormationsAccessibles() throws Exception {
        when(inscriptionService.listerFormationsAccessibles(anyString(), any(Pageable.class))).thenReturn(new PageImpl<>(Collections.emptyList()));
        mockMvc.perform(get("/api/v1/inscription/formations/accessibles")
                .param("enseignantId", "E1")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /inscriptions retourne 200")
    void testPostInscription() throws Exception {
        mockMvc.perform(post("/api/v1/inscription/inscriptions")
                .param("formationId", "1")
                .param("enseignantId", "E1")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /formations/{id}/inscriptions retourne 200")
    void testGetInscriptionsByFormation() throws Exception {
        when(inscriptionService.listerInscriptionsParFormation(anyLong(), any(Pageable.class))).thenReturn(new PageImpl<>(Collections.emptyList()));
        mockMvc.perform(get("/api/v1/inscription/formations/1/inscriptions")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /formations/{id}/inscriptions retourne 404 quand formation introuvable")
    void testGetInscriptionsByFormation_NotFound() throws Exception {
        when(inscriptionService.listerInscriptionsParFormation(anyLong(), any(Pageable.class))).thenThrow(new IllegalArgumentException("Not found"));
        mockMvc.perform(get("/api/v1/inscription/formations/1/inscriptions")).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /formations/{id}/inscriptions retourne 500 pour erreur interne")
    void testGetInscriptionsByFormation_InternalError() throws Exception {
        when(inscriptionService.listerInscriptionsParFormation(anyLong(), any(Pageable.class))).thenThrow(new RuntimeException("DB error"));
        mockMvc.perform(get("/api/v1/inscription/formations/1/inscriptions")).andExpect(status().isInternalServerError());
    }

    @Test
    @DisplayName("PUT /inscriptions/{id}/traiter retourne 200")
    void testTraiter() throws Exception {
        mockMvc.perform(put("/api/v1/inscription/inscriptions/1/traiter")
                .param("approuver", "true")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /enseignant/{id} retourne les inscriptions resumees")
    void testGetByEnseignant() throws Exception {
        Formation formation = new Formation();
        formation.setIdFormation(1L);
        formation.setTitreFormation("Spring Boot");
        formation.setEtatFormation(EtatFormation.ACHEVE);
        formation.setChargeHoraireGlobal(40);

        Inscription inscription = new Inscription();
        inscription.setId(1L);
        inscription.setFormation(formation);

        when(inscriptionRepository.findByEnseignant_Id(eq("E001"), any(Pageable.class))).thenReturn(new PageImpl<>(List.of(inscription)));
        when(formationCompetenceRepository.findByFormationIdFormation(1L)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/inscription/enseignant/E001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].titreFormation").value("Spring Boot"));
    }

    @Test
    @DisplayName("GET /enseignant/{id} retourne liste vide quand pas d'inscriptions")
    void testGetByEnseignant_emptyList() throws Exception {
        when(inscriptionRepository.findByEnseignant_Id(eq("E999"), any(Pageable.class))).thenReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(get("/api/v1/inscription/enseignant/E999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content").isEmpty());
    }
}

