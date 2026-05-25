package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.dto.SeanceDTO;
import esprit.pfe.serviceformation.services.SeanceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Exception personnalisée pour les tests d'erreur interne
class InternalErrorException extends RuntimeException {
    public InternalErrorException(String message) {
        super(message);
    }
}

/**
 * Tests améliorés pour SeanceController
 * Couvre les cas d'erreur et scénarios complexes
 */
@ExtendWith(MockitoExtension.class)
class SeanceControllerEnhancedTest {

    private MockMvc mockMvc;

    @Mock private SeanceService seanceService;
    @InjectMocks private SeanceController controller;

    @BeforeEach
    void setup() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new org.springframework.data.web.config.SpringDataJacksonConfiguration.PageModule(new org.springframework.data.web.config.SpringDataWebSettings(org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode.DIRECT)));
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter(mapper);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(converter)
                .build();
    }

    @Test
    void testCreateSeance_Success() throws Exception {
        SeanceDTO dto = new SeanceDTO();
        dto.setIdSeance(1L);
        when(seanceService.createSeance(any())).thenReturn(dto);

        mockMvc.perform(post("/api/v1/seances")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idSeance").value(1L));
    }

    @Test
    void testCreateSeance_Conflict() throws Exception {
        when(seanceService.createSeance(any()))
                .thenThrow(new IllegalArgumentException("Conflit horaire"));

        mockMvc.perform(post("/api/v1/seances")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Conflit horaire"));
    }

    @Test
    void testCreateSeance_InternalError() throws Exception {
        when(seanceService.createSeance(any()))
                .thenThrow(new RuntimeException("Erreur interne"));

        mockMvc.perform(post("/api/v1/seances")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Erreur interne"));
    }

    @Test
    void testGetAllSeances_Success() throws Exception {
        SeanceDTO dto = new SeanceDTO();
        dto.setIdSeance(1L);
        when(seanceService.getAllSeances(any(Pageable.class))).thenReturn(new PageImpl<>(Collections.singletonList(dto)));

        mockMvc.perform(get("/api/v1/seances"))
                .andExpect(status().isOk());
    }

    @Test
    void testGetAllSeances_Empty() throws Exception {
        when(seanceService.getAllSeances(any(Pageable.class))).thenReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(get("/api/v1/seances"))
                .andExpect(status().isOk());
    }

    @Test
    void testGetAllSeances_InternalError() throws Exception {
        when(seanceService.getAllSeances(any(Pageable.class)))
                .thenThrow(new RuntimeException("Erreur interne"));

        mockMvc.perform(get("/api/v1/seances"))
                .andExpect(status().isInternalServerError());
    }

    @Test
    void testGetSeanceById_Success() throws Exception {
        SeanceDTO dto = new SeanceDTO();
        dto.setIdSeance(1L);
        when(seanceService.getSeanceById(1L)).thenReturn(dto);

        mockMvc.perform(get("/api/v1/seances/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idSeance").value(1L));
    }

    @Test
    void testGetSeanceById_NotFound() throws Exception {
        when(seanceService.getSeanceById(anyLong()))
                .thenThrow(new RuntimeException("Séance introuvable"));

        mockMvc.perform(get("/api/v1/seances/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Séance introuvable"));
    }

    @Test
    void testUpdateSeance_Success() throws Exception {
        SeanceDTO dto = new SeanceDTO();
        dto.setIdSeance(1L);
        when(seanceService.updateSeance(anyLong(), any())).thenReturn(dto);

        mockMvc.perform(put("/api/v1/seances/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idSeance").value(1L));
    }

    @Test
    void testUpdateSeance_Conflict() throws Exception {
        when(seanceService.updateSeance(anyLong(), any()))
                .thenThrow(new IllegalArgumentException("Conflit horaire"));

        mockMvc.perform(put("/api/v1/seances/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Conflit horaire"));
    }

    @Test
    void testUpdateSeance_NotFound() throws Exception {
        when(seanceService.updateSeance(anyLong(), any()))
                .thenThrow(new RuntimeException("Séance introuvable"));

        mockMvc.perform(put("/api/v1/seances/999")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Séance introuvable"));
    }

    @Test
    void testUpdateSeance_InternalError() throws Exception {
        // Utiliser une exception personnalisée qui n'est ni IllegalArgumentException ni RuntimeException
        // pour déclencher le statut 500
        when(seanceService.updateSeance(anyLong(), any()))
                .thenThrow(new InternalErrorException("Erreur interne"));

        mockMvc.perform(put("/api/v1/seances/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Erreur interne"));
    }

    @Test
    void testDeleteSeance_Success() throws Exception {
        doNothing().when(seanceService).deleteSeance(anyLong());

        mockMvc.perform(delete("/api/v1/seances/1"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Séance supprimée avec succès")));
    }

    @Test
    void testDeleteSeance_NotFound() throws Exception {
        doThrow(new RuntimeException("Séance introuvable"))
                .when(seanceService).deleteSeance(anyLong());

        mockMvc.perform(delete("/api/v1/seances/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Séance introuvable"));
    }

    @Test
    void testDeleteSeance_InternalError() throws Exception {
        // Utiliser une exception personnalisée qui n'est ni RuntimeException pour déclencher le statut 500
        doThrow(new InternalErrorException("Erreur interne"))
                .when(seanceService).deleteSeance(anyLong());

        mockMvc.perform(delete("/api/v1/seances/1"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Erreur interne"));
    }
}

