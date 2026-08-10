package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.microsoft.OneDriveService;
import esprit.pfe.serviceformation.microsoft.OutlookMailService;
import esprit.pfe.serviceformation.services.FormationWorkflowService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import org.springframework.test.context.TestPropertySource;

import java.util.Collections;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({OneDriveController.class, MailController.class})
@AutoConfigureMockMvc(addFilters = false)
@TestPropertySource(properties = {
    "azure.ad.client-id=test",
    "azure.ad.client-secret=test",
    "azure.ad.tenant-id=test",
    "azure.ad.enabled=true"
})
class IntegrationControllersTest {

    @Autowired private MockMvc mockMvc;
    @MockitoBean private OneDriveService oneDriveService;
    @MockitoBean private OutlookMailService mailService;
    @MockitoBean private FormationWorkflowService formationWorkflowService;

    // Required: @EnableJpaAuditing on the main class causes @WebMvcTest to need these beans
    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @SuppressWarnings("rawtypes")
    @MockitoBean(name = "auditorProvider")
    private AuditorAware auditorProvider;

    @Test
    void testGetDriveHierarchy() throws Exception {
        when(oneDriveService.getDriveHierarchy()).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/onedrive/hierarchy")).andExpect(status().isOk());
    }
}
