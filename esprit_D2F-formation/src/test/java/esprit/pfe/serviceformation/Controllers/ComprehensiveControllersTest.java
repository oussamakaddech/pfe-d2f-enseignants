package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.exception.GlobalExceptionHandler;
import esprit.pfe.serviceformation.services.*;
import esprit.pfe.serviceformation.microsoft.*;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.converter.ByteArrayHttpMessageConverter;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;

import java.util.Collections;


import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ComprehensiveControllersTest {

    private MockMvc mockMvcFC, mockMvcFCustom, mockMvcMail, mockMvcPKPI, mockMvcEns, mockMvcKPI, mockMvcSeance, mockMvcDoc, mockMvcDept, mockMvcUp, mockMvcInsc, mockMvcOD;

    @Mock private FormationCompetenceService fcService;
    @Mock private FormationClosureService fCustomService;
    @Mock private OutlookMailService mailService;
    @Mock private ParticipantKpiService pkpiService;
    @Mock private EnseignantService ensService;
    @Mock private EnseignantExcelService ensExcelService;
    @Mock private KPIService kpiService;
    @Mock private SeanceService seanceService;
    @Mock private DocumentService docService;
        @Mock private DeptService deptService;
        @Mock private UpService upService;
    @Mock private InscriptionService inscService;
    @Mock private OneDriveService odService;
    @Mock private FormationWorkflowService formationWorkflowService;

    @InjectMocks private FormationCompetenceController fcController;
    @InjectMocks private FormationCustomController fCustomController;
    @InjectMocks private MailController mailController;
    @InjectMocks private ParticipantKpiController pkpiController;
    @InjectMocks private EnseignantController ensController;
    @InjectMocks private KPIController kpiController;
    @InjectMocks private SeanceController seanceController;
    @InjectMocks private DocumentController docController;
    @InjectMocks private DeptController deptController;
    @InjectMocks private UpController upController;
    @InjectMocks private InscriptionController inscController;
    @InjectMocks private OneDriveController odController;

    @BeforeEach
    void setup() {
        var exceptionHandler = new GlobalExceptionHandler();
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new org.springframework.data.web.config.SpringDataJacksonConfiguration.PageModule(
                new org.springframework.data.web.config.SpringDataWebSettings(
                        org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode.DIRECT)));
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter(mapper);
        mockMvcFC = MockMvcBuilders.standaloneSetup(fcController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(new ByteArrayHttpMessageConverter(), new StringHttpMessageConverter(), converter)
                .setControllerAdvice(exceptionHandler)
                .build();
        mockMvcFCustom = MockMvcBuilders.standaloneSetup(fCustomController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(new ByteArrayHttpMessageConverter(), new StringHttpMessageConverter(), converter)
                .setControllerAdvice(exceptionHandler)
                .build();
        mockMvcMail = MockMvcBuilders.standaloneSetup(mailController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(new ByteArrayHttpMessageConverter(), new StringHttpMessageConverter(), converter)
                .setControllerAdvice(exceptionHandler)
                .build();
        mockMvcPKPI = MockMvcBuilders.standaloneSetup(pkpiController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(new ByteArrayHttpMessageConverter(), new StringHttpMessageConverter(), converter)
                .setControllerAdvice(exceptionHandler)
                .build();
        mockMvcEns = MockMvcBuilders.standaloneSetup(ensController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(new ByteArrayHttpMessageConverter(), new StringHttpMessageConverter(), converter)
                .setControllerAdvice(exceptionHandler)
                .build();
        mockMvcKPI = MockMvcBuilders.standaloneSetup(kpiController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(new ByteArrayHttpMessageConverter(), new StringHttpMessageConverter(), converter)
                .setControllerAdvice(exceptionHandler)
                .build();
        mockMvcSeance = MockMvcBuilders.standaloneSetup(seanceController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(new ByteArrayHttpMessageConverter(), new StringHttpMessageConverter(), converter)
                .setControllerAdvice(exceptionHandler)
                .build();
        mockMvcDoc = MockMvcBuilders.standaloneSetup(docController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(new ByteArrayHttpMessageConverter(), new StringHttpMessageConverter(), converter)
                .setControllerAdvice(exceptionHandler)
                .build();
        mockMvcDept = MockMvcBuilders.standaloneSetup(deptController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(new ByteArrayHttpMessageConverter(), new StringHttpMessageConverter(), converter)
                .setControllerAdvice(exceptionHandler)
                .build();
        mockMvcUp = MockMvcBuilders.standaloneSetup(upController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(new ByteArrayHttpMessageConverter(), new StringHttpMessageConverter(), converter)
                .setControllerAdvice(exceptionHandler)
                .build();
        mockMvcInsc = MockMvcBuilders.standaloneSetup(inscController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(new ByteArrayHttpMessageConverter(), new StringHttpMessageConverter(), converter)
                .setControllerAdvice(exceptionHandler)
                .build();
        mockMvcOD = MockMvcBuilders.standaloneSetup(odController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(new ByteArrayHttpMessageConverter(), new StringHttpMessageConverter(), converter)
                .setControllerAdvice(exceptionHandler)
                .build();
    }

    @Test
    void testFormationCompetence() throws Exception {
        when(fcService.getByFormationId(anyLong(), any(Pageable.class))).thenReturn(new PageImpl<>(Collections.emptyList()));
        when(fcService.getByCompetenceId(anyLong(), any(Pageable.class))).thenReturn(new PageImpl<>(Collections.emptyList()));
        when(fcService.getByDomaineId(anyLong(), any(Pageable.class))).thenReturn(new PageImpl<>(Collections.emptyList()));
        mockMvcFC.perform(get("/api/v1/formation-competences/formation/1")).andExpect(status().is2xxSuccessful());

        mockMvcFC.perform(post("/api/v1/formation-competences/formation/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().is2xxSuccessful());

        mockMvcFC.perform(put("/api/v1/formation-competences/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().is2xxSuccessful());

        mockMvcFC.perform(delete("/api/v1/formation-competences/1")).andExpect(status().is2xxSuccessful());

        mockMvcFC.perform(put("/api/v1/formation-competences/formation/1/replace-all")
                .contentType(MediaType.APPLICATION_JSON)
                .content("[]")).andExpect(status().is2xxSuccessful());

        mockMvcFC.perform(get("/api/v1/formation-competences/competence/1")).andExpect(status().is2xxSuccessful());
        mockMvcFC.perform(get("/api/v1/formation-competences/domaine/1")).andExpect(status().is2xxSuccessful());
    }

    @Test
    void testFormationCustom() throws Exception {
        mockMvcFCustom.perform(put("/api/v1/formations-custom/1/generate-certificates")).andExpect(status().is2xxSuccessful());
    }

    @Test
    void testMail() throws Exception {
        String json = "{\"to\":\"test@test.com\",\"subject\":\"Subj\",\"content\":\"Body\"}";
        mockMvcMail.perform(post("/api/v1/mail/send")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json)).andExpect(status().is2xxSuccessful());
    }

    @Test
    void testParticipantKpi() throws Exception {
        String start = "2020-01-01";
        String end = "2025-12-31";
        mockMvcPKPI.perform(get("/api/v1/kpi/participants/formations")
                .param("startDate", start).param("endDate", end)).andExpect(status().is2xxSuccessful());
        mockMvcPKPI.perform(get("/api/v1/kpi/participants/global")
                .param("startDate", start).param("endDate", end)).andExpect(status().is2xxSuccessful());
    }

    @Test
    void testEnseignant() throws Exception {
        when(ensService.getAllEnseignantsDTO(any(Pageable.class))).thenReturn(new PageImpl<>(Collections.emptyList()));
        mockMvcEns.perform(get("/api/v1/enseignants")).andExpect(status().is2xxSuccessful());
        
        when(ensService.getEnseignantById(anyString())).thenReturn(new Enseignant());
        mockMvcEns.perform(get("/api/v1/enseignants/1")).andExpect(status().is2xxSuccessful());
        
        mockMvcEns.perform(post("/api/v1/enseignants")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().is2xxSuccessful());
        mockMvcEns.perform(put("/api/v1/enseignants/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().is2xxSuccessful());
        mockMvcEns.perform(delete("/api/v1/enseignants/1")).andExpect(status().is2xxSuccessful());
    }

    @Test
    void testKPI() throws Exception {
        String start = "2020-01-01";
        String end = "2025-12-31";
        mockMvcKPI.perform(get("/api/v1/kpi/formations").param("start", start).param("end", end)).andExpect(status().is2xxSuccessful());
        mockMvcKPI.perform(get("/api/v1/kpi/heures").param("start", start).param("end", end)).andExpect(status().is2xxSuccessful());
        mockMvcKPI.perform(get("/api/v1/kpi/participants").param("start", start).param("end", end)).andExpect(status().is2xxSuccessful());
        mockMvcKPI.perform(get("/api/v1/kpi/formations-by-etat").param("start", start).param("end", end)).andExpect(status().is2xxSuccessful());
        mockMvcKPI.perform(get("/api/v1/kpi/top-participants").param("start", start).param("end", end)).andExpect(status().is2xxSuccessful());
        mockMvcKPI.perform(get("/api/v1/kpi/top-absentees").param("start", start).param("end", end)).andExpect(status().is2xxSuccessful());
        mockMvcKPI.perform(get("/api/v1/kpi/enseignants-non-affectes").param("start", start).param("end", end)).andExpect(status().is2xxSuccessful());
        mockMvcKPI.perform(get("/api/v1/kpi/count-heures")).andExpect(status().is2xxSuccessful());
        mockMvcKPI.perform(get("/api/v1/kpi/formations-by-type-filtered")).andExpect(status().is2xxSuccessful());
        mockMvcKPI.perform(get("/api/v1/kpi/count-by-trainer-type-with-ids")).andExpect(status().is2xxSuccessful());
    }

    @Test
    void testSeance() throws Exception {
        when(seanceService.getSeanceById(anyLong())).thenReturn(new SeanceDTO());
        mockMvcSeance.perform(post("/api/v1/seances")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().is2xxSuccessful());
        mockMvcSeance.perform(get("/api/v1/seances/1")).andExpect(status().is2xxSuccessful());
        mockMvcSeance.perform(put("/api/v1/seances/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().is2xxSuccessful());
        mockMvcSeance.perform(delete("/api/v1/seances/1")).andExpect(status().is2xxSuccessful());
    }

    @Test
    void testDocument() throws Exception {
        Document dummyDoc = new Document();
        dummyDoc.setFilePath("path/file.txt");
        try {
            java.lang.reflect.Field idField = Document.class.getDeclaredField("idDocument");
            idField.setAccessible(true);
            idField.set(dummyDoc, 1L);
        } catch (Exception e) {
            // Ignorer les erreurs de réflexion lors de la configuration de l'ID
        }

        when(docService.getById(anyLong())).thenReturn(dummyDoc);
        when(docService.getAll(any(Pageable.class))).thenReturn(new PageImpl<>(Collections.emptyList()));
        mockMvcDoc.perform(get("/api/v1/documents/1")).andExpect(status().is2xxSuccessful());
        mockMvcDoc.perform(get("/api/v1/documents")).andExpect(status().is2xxSuccessful());
        mockMvcDoc.perform(delete("/api/v1/documents/1")).andExpect(status().is2xxSuccessful());
        
        when(docService.downloadDocumentFile(anyLong())).thenReturn(new byte[0]);
        mockMvcDoc.perform(get("/api/v1/documents/download/1")).andExpect(status().is2xxSuccessful());
    }

    @Test
    void testDept() throws Exception {
                when(deptService.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(Collections.emptyList()));
                mockMvcDept.perform(get("/api/v1/departements")).andExpect(status().is2xxSuccessful());

                when(deptService.findById(anyString())).thenReturn(new Dept());
                mockMvcDept.perform(get("/api/v1/departements/1")).andExpect(status().is2xxSuccessful());
        
        mockMvcDept.perform(post("/api/v1/departements")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().is2xxSuccessful());
        mockMvcDept.perform(put("/api/v1/departements/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().is2xxSuccessful());
        mockMvcDept.perform(delete("/api/v1/departements/1")).andExpect(status().is2xxSuccessful());
    }

    @Test
    void testUp() throws Exception {
        when(upService.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(Collections.emptyList()));
        mockMvcUp.perform(get("/api/v1/ups")).andExpect(status().is2xxSuccessful());

        when(upService.findById(anyString())).thenReturn(new Up());
        mockMvcUp.perform(get("/api/v1/ups/1")).andExpect(status().is2xxSuccessful());
        
        mockMvcUp.perform(post("/api/v1/ups")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().is2xxSuccessful());
        mockMvcUp.perform(put("/api/v1/ups/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().is2xxSuccessful());
        mockMvcUp.perform(delete("/api/v1/ups/1")).andExpect(status().is2xxSuccessful());
    }

    @Test
    void testInscription() throws Exception {
        mockMvcInsc.perform(get("/api/v1/inscription/formations/accessibles")
                .param("enseignantId", "E1")).andExpect(status().is2xxSuccessful());
        
        mockMvcInsc.perform(post("/api/v1/inscription/inscriptions")
                .param("formationId", "1")
                .param("enseignantId", "E1")).andExpect(status().is2xxSuccessful());
        
        mockMvcInsc.perform(get("/api/v1/inscription/formations/1/inscriptions")).andExpect(status().is2xxSuccessful());
        
        mockMvcInsc.perform(put("/api/v1/inscription/inscriptions/1/traiter")
                .param("approuver", "true")).andExpect(status().is2xxSuccessful());
    }

    @Test
    void testOneDrive() throws Exception {
        mockMvcOD.perform(get("/api/v1/onedrive/hierarchy")).andExpect(status().is2xxSuccessful());
        
        FormationResponseDTO dummyFormation = new FormationResponseDTO();
        dummyFormation.setTitreFormation("Formation Test");
        when(formationWorkflowService.getFormationWorkflowById(anyLong())).thenReturn(dummyFormation);
        mockMvcOD.perform(get("/api/v1/onedrive/formations/1/hierarchy")).andExpect(status().is2xxSuccessful());
    }
}

