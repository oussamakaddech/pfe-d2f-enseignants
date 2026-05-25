package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.services.FormationClosureService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class FormationCustomControllerTest {

    private MockMvc mockMvc;

    @Mock private FormationClosureService formationClosureService;
    @InjectMocks private FormationCustomController controller;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).setCustomArgumentResolvers(new org.springframework.data.web.PageableHandlerMethodArgumentResolver()).build();
    }

    @Test
    void testGenerateCertificates_Success() throws Exception {
        mockMvc.perform(put("/api/v1/formations-custom/1/generate-certificates")).andExpect(status().isOk());
        verify(formationClosureService).generateCertificates(1L, "CERTIF");
    }

    @Test
    void testGenerateCertificates_Conflict() throws Exception {
        doThrow(new RuntimeException("Les certificats ont déjà été générés")).when(formationClosureService).generateCertificates(anyLong(), anyString());
        mockMvc.perform(put("/api/v1/formations-custom/1/generate-certificates")).andExpect(status().isConflict());
    }
}

