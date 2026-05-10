package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.services.InscriptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class InscriptionControllerTest {

    private MockMvc mockMvc;

    @Mock private InscriptionService inscriptionService;
    @InjectMocks private InscriptionController controller;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void testGetFormationsAccessibles() throws Exception {
        when(inscriptionService.listerFormationsAccessibles(anyString())).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/inscription/formations/accessibles")
                .param("enseignantId", "E1")).andExpect(status().isOk());
    }

    @Test
    void testPostInscription() throws Exception {
        mockMvc.perform(post("/api/v1/inscription/inscriptions")
                .param("formationId", "1")
                .param("enseignantId", "E1")).andExpect(status().isOk());
    }

    @Test
    void testGetInscriptionsByFormation() throws Exception {
        when(inscriptionService.listerInscriptionsParFormation(anyLong())).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/inscription/formations/1/inscriptions")).andExpect(status().isOk());
    }

    @Test
    void testGetInscriptionsByFormation_NotFound() throws Exception {
        when(inscriptionService.listerInscriptionsParFormation(anyLong())).thenThrow(new IllegalArgumentException("Not found"));
        mockMvc.perform(get("/api/v1/inscription/formations/1/inscriptions")).andExpect(status().isNotFound());
    }

    @Test
    void testTraiter() throws Exception {
        mockMvc.perform(put("/api/v1/inscription/inscriptions/1/traiter")
                .param("approuver", "true")).andExpect(status().isOk());
    }
}
