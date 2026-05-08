package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.dto.SeanceDTO;
import esprit.pfe.serviceformation.services.SeanceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SeanceController.class)
@DisplayName("SeanceController - Tests unitaires")
class SeanceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private SeanceService seanceService;

    @Test
    @DisplayName("POST /api/v1/seances - Succès")
    @WithMockUser(roles = "ADMIN")
    void shouldCreateSeance() throws Exception {
        SeanceDTO dto = new SeanceDTO();
        dto.setIdSeance(1L);
        dto.setSalle("Salle A");

        when(seanceService.createSeance(any())).thenReturn(dto);

        mockMvc.perform(post("/api/v1/seances")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idSeance").value(1));
    }

    @Test
    @DisplayName("GET /api/v1/seances - Succès")
    @WithMockUser(roles = "ADMIN")
    void shouldGetAll() throws Exception {
        SeanceDTO dto = new SeanceDTO();
        dto.setIdSeance(1L);
        when(seanceService.getAllSeances()).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/seances"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].idSeance").value(1));
    }

    @Test
    @DisplayName("GET /api/v1/seances/{id} - Not Found")
    @WithMockUser(roles = "ADMIN")
    void shouldReturn404WhenNotFound() throws Exception {
        when(seanceService.getSeanceById(99L)).thenThrow(new RuntimeException("Séance introuvable"));

        mockMvc.perform(get("/api/v1/seances/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Séance introuvable"));
    }
}
