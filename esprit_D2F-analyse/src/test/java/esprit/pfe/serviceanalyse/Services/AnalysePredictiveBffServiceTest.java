package esprit.pfe.serviceanalyse.services;

import esprit.pfe.serviceanalyse.service.client.PredictiveEngineClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import esprit.pfe.serviceanalyse.dto.analytics.PageDto;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AnalysePredictiveBffService - Tests")
class AnalysePredictiveBffServiceTest {

    @Mock
    private PredictiveEngineClient engine;

    @InjectMocks
    private AnalysePredictiveBffService service;

    @Test
    @DisplayName("overview: agrège KPIs + résumé d'alertes")
    void overview_aggregatesKpisAndAlerts() {
        when(engine.getOverview(any())).thenReturn(Map.of("nb_enseignants_suivis", 12));
        when(engine.getAlertSummary(any())).thenReturn(Map.of(
                "total", 30, "nouvelles", 5, "critiques_ouvertes", 2, "by_type", List.of()));

        Map<String, Object> result = service.overview("Bearer t");

        assertThat(result).containsKey("kpis").containsEntry("source", "analyse-bff");
        @SuppressWarnings("unchecked")
        Map<String, Object> alertes = (Map<String, Object>) result.get("alertes");
        assertThat(alertes).containsEntry("total", 30).containsEntry("nouvelles", 5).doesNotContainKey("by_type");
    }

    @Test
    @DisplayName("overview: résilient quand le moteur renvoie des maps vides")
    void overview_resilientWithEmptyEngine() {
        when(engine.getOverview(any())).thenReturn(Map.of());
        when(engine.getAlertSummary(any())).thenReturn(Map.of());

        Map<String, Object> result = service.overview("Bearer t");

        @SuppressWarnings("unchecked")
        Map<String, Object> alertes = (Map<String, Object>) result.get("alertes");
        assertThat(alertes).containsEntry("total", 0).containsEntry("nouvelles", 0);
    }

    @Test
    @DisplayName("alertsDigest: résumé + top 5 actions")
    void alertsDigest_combinesSummaryAndActions() {
        when(engine.getAlertSummary(any())).thenReturn(Map.of("total", 10));
        when(engine.getPriorityActions(eq(5), isNull(), any()))
                .thenReturn(List.of(Map.of("enseignant_id", "t1")));

        Map<String, Object> result = service.alertsDigest("Bearer t");

        assertThat(result).containsKey("resume");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> actions = (List<Map<String, Object>>) result.get("actions_prioritaires");
        assertThat(actions).hasSize(1);
    }

    @Test
    @DisplayName("priorityActions: délègue au moteur avec les filtres")
    void priorityActions_delegates() {
        when(engine.getPriorityActions(eq(15), eq("D1"), any()))
                .thenReturn(List.of(Map.of("enseignant_id", "t9")));

        PageDto<Map<String, Object>> result = service.priorityActions(PageRequest.of(0, 15), "D1", "Bearer t");

        assertThat(result.items()).hasSize(1);
        assertThat(result.items().get(0)).containsEntry("enseignant_id", "t9");
    }
}
