package esprit.pfe.serviceanalyse.client;

import esprit.pfe.serviceanalyse.dto.analytics.AlertDto;
import esprit.pfe.serviceanalyse.dto.analytics.DashboardOverviewDto;
import esprit.pfe.serviceanalyse.dto.analytics.DemandForecastDto;
import esprit.pfe.serviceanalyse.dto.analytics.GapHeatmapDto;
import esprit.pfe.serviceanalyse.dto.analytics.JobDto;
import esprit.pfe.serviceanalyse.dto.analytics.ModelHealthDto;
import esprit.pfe.serviceanalyse.dto.analytics.PageDto;
import esprit.pfe.serviceanalyse.dto.analytics.PriorityActionDto;
import esprit.pfe.serviceanalyse.dto.analytics.RetrainRequestDto;
import esprit.pfe.serviceanalyse.dto.analytics.RiskDistributionItemDto;
import esprit.pfe.serviceanalyse.dto.analytics.TeacherRiskProfileDto;
import esprit.pfe.serviceanalyse.exception.PredictiveAnalyticsUnavailableException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Verifies the core resilience guarantee: when the FastAPI engine is unreachable,
 * the typed client surfaces a {@link PredictiveAnalyticsUnavailableException}
 * (HTTP 502) — it NEVER returns a silent empty body hiding the outage.
 */
@SpringBootTest
@TestPropertySource(locations = "classpath:application-test.properties")
class PredictiveAnalyticsClientTest {

    @Autowired
    private PredictiveAnalyticsClient client;

    @MockitoBean
    private RestTemplate restTemplate;

    @Test
    void upstreamOutageIsLoudNotSilent() {
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(Class.class)))
                .thenThrow(new ResourceAccessException("connection refused"));

        assertThrows(PredictiveAnalyticsUnavailableException.class,
                () -> client.getDashboardOverview(null, "Bearer x"));
    }

    @Test
    void upstreamOutageOnProfileIsLoud() {
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(Class.class)))
                .thenThrow(new ResourceAccessException("connection refused"));

        assertThrows(PredictiveAnalyticsUnavailableException.class,
                () -> client.getTeacherProfile("T1", "Bearer x"));
    }

    @Test
    void getDashboardOverview_returnsDtoOnSuccess() {
        DashboardOverviewDto dto = mock(DashboardOverviewDto.class);
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(Class.class)))
                .thenReturn(new ResponseEntity<>(dto, HttpStatus.OK));

        DashboardOverviewDto result = client.getDashboardOverview(null, "Bearer x");
        assertSame(dto, result);
    }

    @Test
    void getTeacherProfile_returnsDtoOnSuccess() {
        TeacherRiskProfileDto dto = mock(TeacherRiskProfileDto.class);
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(Class.class)))
                .thenReturn(new ResponseEntity<>(dto, HttpStatus.OK));

        TeacherRiskProfileDto result = client.getTeacherProfile("T1", "Bearer x");
        assertSame(dto, result);
    }

    @Test
    void getTeachers_returnsPageOnSuccess() {
        PageDto<TeacherRiskProfileDto> page = mock(PageDto.class);
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(org.springframework.core.ParameterizedTypeReference.class))).thenReturn(new ResponseEntity<>(page, HttpStatus.OK));

        PageDto<TeacherRiskProfileDto> result = client.getTeachers(null, null, 1, 20, "Bearer x");
        assertSame(page, result);
    }

    @Test
    void analyzeTeacher_returnsJobOnSuccess() {
        JobDto job = mock(JobDto.class);
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(Class.class)))
                .thenReturn(new ResponseEntity<>(job, HttpStatus.OK));

        JobDto result = client.analyzeTeacher("T1", "Bearer x");
        assertSame(job, result);
    }

    @Test
    void patchAlert_returnsDtoOnSuccess() {
        AlertDto alert = mock(AlertDto.class);
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(Class.class)))
                .thenReturn(new ResponseEntity<>(alert, HttpStatus.OK));

        AlertDto result = client.patchAlert("A1", null, "Bearer x");
        assertSame(alert, result);
    }

    @Test
    void bulkPatchAlerts_returnsCountOnSuccess() {
        PredictiveAnalyticsClient.MapCountDto count = new PredictiveAnalyticsClient.MapCountDto(3);
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(Class.class)))
                .thenReturn(new ResponseEntity<>(count, HttpStatus.OK));

        int result = client.bulkPatchAlerts(null, "Bearer x");
        assertEquals(3, result);
    }

    @Test
    void getRiskDistribution_returnsListOnSuccess() {
        List<RiskDistributionItemDto> items = mock(List.class);
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(org.springframework.core.ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(items, HttpStatus.OK));

        List<RiskDistributionItemDto> result = client.getRiskDistribution("D1", "Bearer x");
        assertSame(items, result);
    }

    @Test
    void getGapHeatmap_returnsDtoOnSuccess() {
        GapHeatmapDto dto = mock(GapHeatmapDto.class);
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(Class.class)))
                .thenReturn(new ResponseEntity<>(dto, HttpStatus.OK));

        GapHeatmapDto result = client.getGapHeatmap("D1", "Bearer x");
        assertSame(dto, result);
    }

    @Test
    void getDemandForecast_returnsDtoOnSuccess() {
        DemandForecastDto dto = mock(DemandForecastDto.class);
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(Class.class)))
                .thenReturn(new ResponseEntity<>(dto, HttpStatus.OK));

        DemandForecastDto result = client.getDemandForecast(6, "Bearer x");
        assertSame(dto, result);
    }

    @Test
    void getModelHealth_returnsDtoOnSuccess() {
        ModelHealthDto dto = mock(ModelHealthDto.class);
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(Class.class)))
                .thenReturn(new ResponseEntity<>(dto, HttpStatus.OK));

        ModelHealthDto result = client.getModelHealth("Bearer x");
        assertSame(dto, result);
    }

    @Test
    void getJob_returnsDtoOnSuccess() {
        JobDto dto = mock(JobDto.class);
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(Class.class)))
                .thenReturn(new ResponseEntity<>(dto, HttpStatus.OK));

        JobDto result = client.getJob("J1", "Bearer x");
        assertSame(dto, result);
    }

    @Test
    void patchAction_returnsDtoOnSuccess() {
        PriorityActionDto dto = mock(PriorityActionDto.class);
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(Class.class)))
                .thenReturn(new ResponseEntity<>(dto, HttpStatus.OK));

        PriorityActionDto result = client.patchAction("A1", null, "Bearer x");
        assertSame(dto, result);
    }

    @Test
    void retrain_returnsDtoOnSuccess() {
        ModelHealthDto dto = mock(ModelHealthDto.class);
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(Class.class)))
                .thenReturn(new ResponseEntity<>(dto, HttpStatus.OK));

        ModelHealthDto result = client.retrain(mock(RetrainRequestDto.class), "Bearer x");
        assertSame(dto, result);
    }

    @Test
    void getAlerts_returnsPageOnSuccess() {
        PageDto<AlertDto> page = mock(PageDto.class);
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(org.springframework.core.ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(page, HttpStatus.OK));

        PageDto<AlertDto> result = client.getAlerts("OPEN", "D1", 0, 20, "Bearer x");
        assertSame(page, result);
    }

    @Test
    void getPriorityActions_returnsPageOnSuccess() {
        PageDto<PriorityActionDto> page = mock(PageDto.class);
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(org.springframework.core.ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(page, HttpStatus.OK));

        PageDto<PriorityActionDto> result = client.getPriorityActions("D1", 0, 20, "Bearer x");
        assertSame(page, result);
    }
}
