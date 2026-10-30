package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.dto.CertificateEligibilitySummaryDTO;
import esprit.pfe.serviceformation.services.CertificateEligibilityService;
import esprit.pfe.serviceformation.services.FormationClosureService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class FormationCustomControllerTest {

    private MockMvc mockMvc;

    @Mock private FormationClosureService formationClosureService;
    @Mock private CertificateEligibilityService certificateEligibilityService;
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
    void testGenerateCertificates_AttestationType() throws Exception {
        mockMvc.perform(put("/api/v1/formations-custom/1/generate-certificates")
                        .queryParam("typeCertif", "attestation"))
                .andExpect(status().isOk());
        // Le type est normalisé en majuscules avant d'atteindre le service.
        verify(formationClosureService).generateCertificates(1L, "ATTESTATION");
    }

    @Test
    void testGenerateCertificates_BadgeType() throws Exception {
        mockMvc.perform(put("/api/v1/formations-custom/1/generate-certificates")
                        .queryParam("typeCertif", "BADGE"))
                .andExpect(status().isOk());
        verify(formationClosureService).generateCertificates(1L, "BADGE");
    }

    @Test
    void testGenerateCertificates_InvalidType_ShouldReturn400() throws Exception {
        mockMvc.perform(put("/api/v1/formations-custom/1/generate-certificates")
                        .queryParam("typeCertif", "DIPLOME"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(formationClosureService);
    }

    @Test
    void testGenerateCertificates_Conflict() throws Exception {
        doThrow(new RuntimeException("Les certificats ont déjà été générés")).when(formationClosureService).generateCertificates(anyLong(), anyString());
        mockMvc.perform(put("/api/v1/formations-custom/1/generate-certificates")).andExpect(status().isConflict());
    }

    @Test
    void testGetEligibility_Eligible() throws Exception {
        CertificateEligibilitySummaryDTO summary = CertificateEligibilitySummaryDTO.builder()
                .trainingId(1L)
                .participantId("ENS001")
                .eligible(true)
                .rejectionReasons(List.of())
                .warnings(List.of())
                .riskLevel("LOW")
                .attendanceOk(true)
                .postTestOk(true)
                .evaluationSubmitted(true)
                .build();
        when(certificateEligibilityService.evaluateEligibilityWithSummary(1L, "ENS001")).thenReturn(summary);

        mockMvc.perform(get("/api/v1/formations-custom/1/certificates/eligibility/ENS001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.riskLevel").value("LOW"))
                .andExpect(jsonPath("$.attendanceOk").value(true));

        verify(certificateEligibilityService).evaluateEligibilityWithSummary(1L, "ENS001");
    }

    @Test
    void testGetEligibility_Ineligible() throws Exception {
        CertificateEligibilitySummaryDTO summary = CertificateEligibilitySummaryDTO.builder()
                .trainingId(1L)
                .participantId("ENS002")
                .eligible(false)
                .rejectionReasons(List.of("Taux de présence insuffisant: 60.0% (requis: 80.0%)"))
                .warnings(List.of())
                .riskLevel("HIGH")
                .attendanceOk(false)
                .postTestOk(true)
                .evaluationSubmitted(true)
                .build();
        when(certificateEligibilityService.evaluateEligibilityWithSummary(1L, "ENS002")).thenReturn(summary);

        mockMvc.perform(get("/api/v1/formations-custom/1/certificates/eligibility/ENS002"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(false))
                .andExpect(jsonPath("$.rejectionReasons[0]").value("Taux de présence insuffisant: 60.0% (requis: 80.0%)"))
                .andExpect(jsonPath("$.attendanceOk").value(false));
    }
}
