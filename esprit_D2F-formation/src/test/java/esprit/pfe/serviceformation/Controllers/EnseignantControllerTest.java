package esprit.pfe.serviceformation.controllers;


import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.services.EnseignantExcelService;
import esprit.pfe.serviceformation.services.EnseignantService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class EnseignantControllerTest {

    private MockMvc mockMvc;

    @Mock private EnseignantService enseignantService;
    @Mock private EnseignantExcelService excelService;
    @InjectMocks private EnseignantController controller;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void testGetAllEnseignants() throws Exception {
        when(enseignantService.getAllEnseignantsDTO()).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/enseignants")).andExpect(status().isOk());
    }

    @Test
    void testGetEnseignantById() throws Exception {
        when(enseignantService.getEnseignantById(anyString())).thenReturn(new Enseignant());
        mockMvc.perform(get("/api/v1/enseignants/1")).andExpect(status().isOk());
    }

    @Test
    void testCreateEnseignant() throws Exception {
        when(enseignantService.createEnseignant(any())).thenReturn(new Enseignant());
        mockMvc.perform(post("/api/v1/enseignants")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().isOk());
    }

    @Test
    void testUpdateEnseignant() throws Exception {
        when(enseignantService.updateEnseignant(anyString(), any())).thenReturn(new Enseignant());
        mockMvc.perform(put("/api/v1/enseignants/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().isOk());
    }

    @Test
    void testDeleteEnseignant() throws Exception {
        mockMvc.perform(delete("/api/v1/enseignants/1")).andExpect(status().isNoContent());
    }

    @Test
    void testUploadEnseignants_Success() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content".getBytes());
        mockMvc.perform(multipart("/api/v1/enseignants/upload").file(file)).andExpect(status().isOk());
    }

    @Test
    void testUploadEnseignants_Failure() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content".getBytes());
        doThrow(new RuntimeException("Import error")).when(excelService).importEnseignantsFromExcel(any());
        mockMvc.perform(multipart("/api/v1/enseignants/upload").file(file)).andExpect(status().isBadRequest());
    }
}