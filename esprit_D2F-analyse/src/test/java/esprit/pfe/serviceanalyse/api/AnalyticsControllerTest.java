package esprit.pfe.serviceanalyse.api;

import esprit.pfe.serviceanalyse.dto.analytics.*;
import esprit.pfe.serviceanalyse.service.AnalyticsBffService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AnalyticsController.class)
@EnableMethodSecurity
class AnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AnalyticsBffService bffService;

    private DashboardOverviewDto sampleOverview() {
        return new DashboardOverviewDto("global", java.util.Map.of(), 0, 0.0, 0, 0, 0,
                new CoverageDto("global", 80.0, DataQualityStatus.CALCULATED, null, 10, 10, 10, 8, OffsetDateTime.now()),
                new ModelHealthSummaryDto("v1", "rule-based", "VALID", "STABLE", 0.9),
                new PlatformHealthDto(90.0, "OK", java.util.Map.of()),
                OffsetDateTime.now());
    }

    @Test
    void overviewRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v2/analytics/dashboard/overview")).andExpect(status().isUnauthorized());
    }

    @Test
    void overviewReturnsOkWhenAuthenticated() throws Exception {
        when(bffService.dashboardOverview(any(), any())).thenReturn(sampleOverview());
        mockMvc.perform(get("/api/v2/analytics/dashboard/overview")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_CHEF_DEPARTEMENT"))))
                .andExpect(status().isOk());
    }

    @Test
    void teacherProfileRouted() throws Exception {
        TeacherRiskProfileDto profile = new TeacherRiskProfileDto("T1", "A B", "AB", "D1", "Info",
                0.3, 30, RiskLevel.MODERATE, RiskTrend.STABLE, List.of(), 0, List.of(), "act",
                OffsetDateTime.now(), "v2.0", DataQualityStatus.CALCULATED);
        when(bffService.teacherProfile(eq("T1"), any())).thenReturn(profile);
        mockMvc.perform(get("/api/v2/analytics/teachers/T1/profile")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_CHEF_DEPARTEMENT"))))
                .andExpect(status().isOk());
    }

    @Test
    void analyzeRequiresAdminRole() throws Exception {
        // Without ADMIN authority -> 403 (RBAC at BFF edge).
        mockMvc.perform(post("/api/v2/analytics/teachers/T1/analyze").with(jwt()))
                .andExpect(status().isForbidden());
    }

    @Test
    void analyzeReturnsAcceptedForAdmin() throws Exception {
        JobDto job = new JobDto("J1", "SINGLE", "T1", "PENDING", 0, 1, null,
                OffsetDateTime.now(), null, "/api/v2/analytics/jobs/J1");
        when(bffService.analyzeTeacher(eq("T1"), any())).thenReturn(job);
        mockMvc.perform(post("/api/v2/analytics/teachers/T1/analyze")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isAccepted());
    }
}
