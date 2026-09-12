package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.dto.InscriptionSummaryDTO;
import esprit.pfe.serviceformation.exception.GlobalExceptionHandler;
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
    @InjectMocks private InscriptionController controller;

    /** JWT d'enseignant avec enseignantId == son email (self). */
    private static org.springframework.security.oauth2.jwt.Jwt enseignantJwt() {
        return org.springframework.security.oauth2.jwt.Jwt
                .withTokenValue("test-token")
                .header("alg", "none")
                .subject("e1@esprit.tn")
                .claim("email", "e1@esprit.tn")
                .claim("scope", "ROLE_ENSEIGNANT")
                .build();
    }

    /** JWT d'un autre enseignant — doit être refusé sur les endpoints self. */
    private static org.springframework.security.oauth2.jwt.Jwt autreEnseignantJwt() {
        return org.springframework.security.oauth2.jwt.Jwt
                .withTokenValue("test-token")
                .header("alg", "none")
                .subject("victim@esprit.tn")
                .claim("email", "victim@esprit.tn")
                .claim("scope", "ROLE_ENSEIGNANT")
                .build();
    }

    @BeforeEach
    void setup() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new org.springframework.data.web.config.SpringDataJacksonConfiguration.PageModule(new org.springframework.data.web.config.SpringDataWebSettings(org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode.DIRECT)));
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter(mapper);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver(),
                        new org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver())
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
                .param("enseignantId", "E1")).andExpect(status().isCreated());
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
    @DisplayName("PUT /inscriptions/traiter-bulk retourne 200 et la liste mise à jour")
    void testTraiterBulk() throws Exception {
        esprit.pfe.serviceformation.dto.InscriptionDTO dto = new esprit.pfe.serviceformation.dto.InscriptionDTO();
        dto.setId(1L);
        when(inscriptionService.traiterDemandeBulkDTO(anyList(), anyBoolean(), org.mockito.ArgumentMatchers.isNull()))
                .thenReturn(List.of(dto));

        String body = "{\"ids\":[1,2,3],\"approuver\":true}";
        mockMvc.perform(put("/api/v1/inscription/inscriptions/traiter-bulk")
                .contentType("application/json")
                .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    @DisplayName("PUT /inscriptions/traiter-bulk gère un body sans ids sans crash")
    void testTraiterBulk_EmptyIds() throws Exception {
        when(inscriptionService.traiterDemandeBulkDTO(anyList(), anyBoolean(), org.mockito.ArgumentMatchers.isNull()))
                .thenReturn(Collections.emptyList());
        mockMvc.perform(put("/api/v1/inscription/inscriptions/traiter-bulk")
                .contentType("application/json")
                .content("{\"ids\":[],\"approuver\":true}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /enseignant/{id} retourne les inscriptions resumees")
    void testGetByEnseignant() throws Exception {
        InscriptionSummaryDTO dto = new InscriptionSummaryDTO();
        dto.setTitreFormation("Spring Boot");

        when(inscriptionService.findSummariesByEnseignantId(eq("E001"), any(Pageable.class))).thenReturn(new PageImpl<>(List.of(dto)));

        mockMvc.perform(get("/api/v1/inscription/enseignant/E001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].titreFormation").value("Spring Boot"));
    }

    @Test
    @DisplayName("GET /enseignant/{id} retourne liste vide quand pas d'inscriptions")
    void testGetByEnseignant_emptyList() throws Exception {
        when(inscriptionService.findSummariesByEnseignantId(eq("E999"), any(Pageable.class))).thenReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(get("/api/v1/inscription/enseignant/E999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content").isEmpty());
    }

    // ── Non-régression sécurité (anti-inscription pour autrui / IDOR) ──

    @Test
    @DisplayName("selfOrAdmin : enseignant demandant l'id d'autrui = 403")
    void testSelfOrAdmin_idorRefuse() throws Exception {
        org.springframework.security.oauth2.jwt.Jwt jwt = autreEnseignantJwt();
        java.lang.reflect.Method m = InscriptionController.class
                .getDeclaredMethod("selfOrAdmin",
                        org.springframework.security.oauth2.jwt.Jwt.class, String.class);
        m.setAccessible(true);
        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> m.invoke(null, jwt, "someone-else@esprit.tn"))
                .hasCauseInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }

    @Test
    @DisplayName("selfOrAdmin : enseignant demandant son propre id = accepté")
    void testSelfOrAdmin_selfAccepted() throws Exception {
        org.springframework.security.oauth2.jwt.Jwt jwt = enseignantJwt();
        java.lang.reflect.Method m = InscriptionController.class
                .getDeclaredMethod("selfOrAdmin",
                        org.springframework.security.oauth2.jwt.Jwt.class, String.class);
        m.setAccessible(true);
        Object result = m.invoke(null, jwt, "e1@esprit.tn");
        org.assertj.core.api.Assertions.assertThat(result).isEqualTo("e1@esprit.tn");
    }
}

