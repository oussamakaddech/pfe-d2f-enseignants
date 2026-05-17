package esprit.pfe.serviceanalyse.controllers;

import esprit.pfe.serviceanalyse.dto.passport.TeacherIdentityDTO;
import esprit.pfe.serviceanalyse.dto.passport.TeacherSkillPassportDTO;
import esprit.pfe.serviceanalyse.exception.PassportAccessDeniedException;
import esprit.pfe.serviceanalyse.service.passport.SkillPassportAssembler;
import esprit.pfe.serviceanalyse.service.passport.SkillPassportAuthorizationService;
import esprit.pfe.serviceanalyse.service.passport.SkillPassportPdfGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SkillPassportController.class)
@AutoConfigureMockMvc(addFilters = false)
class SkillPassportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SkillPassportAssembler assembler;

    @MockitoBean
    private SkillPassportPdfGenerator pdfGenerator;

    @MockitoBean
    private SkillPassportAuthorizationService authorizationService;

    private TeacherSkillPassportDTO samplePassport;

    @BeforeEach
    void setup() {
        TeacherIdentityDTO identity = TeacherIdentityDTO.builder()
                .enseignantId("user1")
                .username("jdoe")
                .prenom("John")
                .nom("Doe")
                .email("jdoe@esprit.tn")
                .build();

        samplePassport = TeacherSkillPassportDTO.builder()
                .identity(identity)
                .dateGeneration("2026-05-14T10:00:00")
                .scoreGlobal(3.5)
                .statut("en_progression")
                .totalSavoirsMaitrises(12)
                .totalFormations(3)
                .totalCertifications(1)
                .totalGaps(2)
                .domaines(Collections.emptyList())
                .formations(Collections.emptyList())
                .certifications(Collections.emptyList())
                .gaps(Collections.emptyList())
                .recommandations(Collections.emptyList())
                .build();
    }

    // ── GET /api/v1/skill-passports/teacher/{username}/json ───────────────

    @Test
    void getPassportJson_returns200WithData() throws Exception {
        doNothing().when(authorizationService).checkAccess(any(Authentication.class), eq("jdoe"));
        when(authorizationService.extractUsername(any())).thenReturn("admin");
        when(assembler.assemble(eq("jdoe"), any())).thenReturn(samplePassport);

        mockMvc.perform(get("/api/v1/skill-passports/teacher/jdoe/json")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.scoreGlobal").value(3.5))
                .andExpect(jsonPath("$.identity.username").value("jdoe"))
                .andExpect(jsonPath("$.totalSavoirsMaitrises").value(12));
    }

    // ── GET /api/v1/skill-passports/teacher/{username} (PDF) ─────────────

    @Test
    void getPassportPdf_returns200WithPdfHeaders() throws Exception {
        byte[] fakePdf = "fake-pdf-bytes".getBytes();
        doNothing().when(authorizationService).checkAccess(any(Authentication.class), eq("jdoe"));
        when(authorizationService.extractUsername(any())).thenReturn("admin");
        when(assembler.assemble(eq("jdoe"), any())).thenReturn(samplePassport);
        when(pdfGenerator.generate(any())).thenReturn(fakePdf);

        mockMvc.perform(get("/api/v1/skill-passports/teacher/jdoe")
                        .accept(MediaType.APPLICATION_PDF))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("skill-passport-jdoe")));
    }

    // ── GET /api/v1/skill-passports/me/json ───────────────────────────────

    @Test
    void getMyPassportJson_returns200() throws Exception {
        when(authorizationService.extractUsername(any())).thenReturn("jdoe");
        when(assembler.assemble(eq("jdoe"), any())).thenReturn(samplePassport);

        mockMvc.perform(get("/api/v1/skill-passports/me/json")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.identity.nom").value("Doe"));
    }

    // ── Sécurité : refus RBAC ─────────────────────────────────────────────

    @Test
    void getPassportJson_returns403WhenAccessDenied() throws Exception {
        doThrow(new PassportAccessDeniedException("Accès refusé."))
                .when(authorizationService).checkAccess(any(Authentication.class), eq("autre"));

        mockMvc.perform(get("/api/v1/skill-passports/teacher/autre/json")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    // ── GET /api/v1/skill-passports/me (PDF) ──────────────────────────────

    @Test
    void getMyPassportPdf_returnsCorrectContentDisposition() throws Exception {
        byte[] fakePdf = "pdf".getBytes();
        when(authorizationService.extractUsername(any())).thenReturn("jdoe");
        when(assembler.assemble(eq("jdoe"), any())).thenReturn(samplePassport);
        when(pdfGenerator.generate(any())).thenReturn(fakePdf);

        mockMvc.perform(get("/api/v1/skill-passports/me")
                        .accept(MediaType.APPLICATION_PDF))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("attachment")));
    }
}
