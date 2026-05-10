package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.services.SeanceService;
import esprit.pfe.serviceformation.services.InscriptionService;
import esprit.pfe.serviceformation.services.DocumentService;
import esprit.pfe.serviceformation.services.FormationCompetenceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class MiscControllersTest {

    private MockMvc mockMvc;
    @Mock private SeanceService seanceService;
    @Mock private InscriptionService inscriptionService;
    @Mock private DocumentService documentService;
    @Mock private FormationCompetenceService formationCompetenceService;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(new SeanceController(seanceService)).build();
    }

    @Test
    void testGetAllSeances() throws Exception {
        when(seanceService.getAllSeances()).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/seances")).andExpect(status().isOk());
    }
}
