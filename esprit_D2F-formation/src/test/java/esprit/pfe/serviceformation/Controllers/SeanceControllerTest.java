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

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class SeanceControllerTest {

    private MockMvc mockMvc;

    @Mock private SeanceService seanceService;
    @InjectMocks private SeanceController controller;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void testCreateSeance_Success() throws Exception {
        when(seanceService.createSeance(any())).thenReturn(new SeanceDTO());
        mockMvc.perform(post("/api/v1/seances")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().isCreated());
    }

    @Test
    void testCreateSeance_Conflict() throws Exception {
        when(seanceService.createSeance(any())).thenThrow(new IllegalArgumentException("Conflict"));
        mockMvc.perform(post("/api/v1/seances")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().isBadRequest());
    }

    @Test
    void testCreateSeance_Error() throws Exception {
        // Triggering the Exception block (500)
        when(seanceService.createSeance(any())).thenThrow(new RuntimeException("Err"));
        mockMvc.perform(post("/api/v1/seances")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().isInternalServerError());
    }

    @Test
    void testGetAllSeances() throws Exception {
        when(seanceService.getAllSeances()).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/seances")).andExpect(status().isOk());
    }

    @Test
    void testGetAllSeances_Error() throws Exception {
        when(seanceService.getAllSeances()).thenThrow(new RuntimeException("Err"));
        mockMvc.perform(get("/api/v1/seances")).andExpect(status().isInternalServerError());
    }

    @Test
    void testGetSeanceById_NotFound() throws Exception {
        when(seanceService.getSeanceById(anyLong())).thenThrow(new RuntimeException("Not found"));
        mockMvc.perform(get("/api/v1/seances/1")).andExpect(status().isNotFound());
    }

    @Test
    void testUpdateSeance_Success() throws Exception {
        when(seanceService.updateSeance(anyLong(), any())).thenReturn(new SeanceDTO());
        mockMvc.perform(put("/api/v1/seances/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().isOk());
    }

    @Test
    void testUpdateSeance_Error() throws Exception {
        when(seanceService.updateSeance(anyLong(), any())).thenThrow(new RuntimeException("Err"));
        mockMvc.perform(put("/api/v1/seances/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().isNotFound());
    }

    @Test
    void testDeleteSeance_Success() throws Exception {
        mockMvc.perform(delete("/api/v1/seances/1")).andExpect(status().isOk());
    }

    @Test
    void testDeleteSeance_Error() throws Exception {
        doThrow(new RuntimeException("Err")).when(seanceService).deleteSeance(anyLong());
        mockMvc.perform(delete("/api/v1/seances/1")).andExpect(status().isNotFound());
    }
}
