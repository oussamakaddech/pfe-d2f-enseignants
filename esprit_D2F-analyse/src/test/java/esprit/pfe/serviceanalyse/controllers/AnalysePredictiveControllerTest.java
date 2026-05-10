package esprit.pfe.serviceanalyse.controllers;

import esprit.pfe.serviceanalyse.services.AnalysePredictiveService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AnalysePredictiveController.class)
@AutoConfigureMockMvc(addFilters = false)
class AnalysePredictiveControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AnalysePredictiveService analysePredictiveService;

    @Test
    void testAnalyserEnseignant() throws Exception {
        when(analysePredictiveService.analyserEnseignant(anyString(), any())).thenReturn(Collections.emptyMap());

        mockMvc.perform(get("/analyse-predictive/enseignant/ens1"))
                .andExpect(status().isOk());
    }

    @Test
    void testTendancesGlobales() throws Exception {
        when(analysePredictiveService.analyserTendancesGlobales()).thenReturn(Collections.emptyMap());

        mockMvc.perform(get("/analyse-predictive/tendances"))
                .andExpect(status().isOk());
    }
}
