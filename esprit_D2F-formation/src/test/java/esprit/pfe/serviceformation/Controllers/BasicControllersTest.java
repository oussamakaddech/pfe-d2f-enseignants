package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.services.DeptService;
import esprit.pfe.serviceformation.services.UpService;
import esprit.pfe.serviceformation.services.EnseignantService;
import esprit.pfe.serviceformation.services.EnseignantExcelService;
import esprit.pfe.serviceformation.repositories.DeptRepository;
import esprit.pfe.serviceformation.repositories.UpRepository;
import esprit.pfe.serviceformation.services.FormationClosureService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class BasicControllersTest {

    private MockMvc mockMvcDept;
    private MockMvc mockMvcUp;
    private MockMvc mockMvcEns;

    @Mock private DeptService deptService;
    @Mock private DeptRepository deptRepository;
    @Mock private UpService upService;
    @Mock private UpRepository upRepository;
    @Mock private EnseignantService enseignantService;
    @Mock private EnseignantExcelService excelService;
    @Mock private FormationClosureService formationClosureService;

    @BeforeEach
    void setup() {
        mockMvcDept = MockMvcBuilders.standaloneSetup(new DeptController(deptRepository, deptService)).build();
        mockMvcUp = MockMvcBuilders.standaloneSetup(new UpController(upRepository, upService)).build();
        mockMvcEns = MockMvcBuilders.standaloneSetup(new EnseignantController(excelService, enseignantService)).build();
    }

    @Test
    void testDeptUpload() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "text/plain", "data".getBytes());
        mockMvcDept.perform(multipart("/api/v1/departements/import-excel").file(file)).andExpect(status().isOk());
        verify(deptService).importDeptsFromExcel(any());
    }

    @Test
    void testUpUpload() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "text/plain", "data".getBytes());
        mockMvcUp.perform(multipart("/api/v1/ups/import-excel").file(file)).andExpect(status().isOk());
        verify(upService).importUpsFromExcel(any());
    }

    @Test
    void testGetAllEnseignants() throws Exception {
        when(enseignantService.getAllEnseignantsDTO()).thenReturn(Collections.emptyList());
        mockMvcEns.perform(get("/api/v1/enseignants")).andExpect(status().isOk());
    }
}
