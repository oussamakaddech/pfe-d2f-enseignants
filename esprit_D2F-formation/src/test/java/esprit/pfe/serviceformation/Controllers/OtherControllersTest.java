package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.services.*;
import esprit.pfe.serviceformation.repositories.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;


import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({DocumentController.class, SeanceController.class, UpController.class, DeptController.class})
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("OtherControllers - Tests d'intégration Web")
class OtherControllersTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private DocumentService documentService;
    @MockitoBean private SeanceService seanceService;
    @MockitoBean private UpService upService;
    @MockitoBean private DeptService deptService;
    
    @MockitoBean private UpRepository upRepository;
    @MockitoBean private DeptRepository deptRepository;
    @MockitoBean private SeanceFormationRepository seanceFormationRepository;
    @MockitoBean private DocumentRepository documentRepository;

    @Test
    @DisplayName("DocumentController - getAllDocuments")
    void shouldGetAllDocuments() throws Exception {
        mockMvc.perform(get("/api/v1/documents")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("SeanceController - getAllSeances")
    void shouldGetAllSeances() throws Exception {
        mockMvc.perform(get("/api/v1/seances")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("UpController - getAllUps")
    void shouldGetAllUps() throws Exception {
        mockMvc.perform(get("/api/v1/ups")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("DeptController - getAllDepts")
    void shouldGetAllDepts() throws Exception {
        mockMvc.perform(get("/api/v1/departements")).andExpect(status().isOk());
    }
}
