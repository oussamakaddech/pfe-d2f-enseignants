package esprit.pfe.serviceevaluation.services;

import esprit.pfe.serviceevaluation.entities.EvaluationGlobale;
import esprit.pfe.serviceevaluation.repositories.EvaluationGlobaleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("EvaluationRefreshScheduler - Tests unitaires")
class EvaluationRefreshSchedulerTest {

    @Mock
    private EvaluationGlobaleRepository evaluationGlobaleRepository;

    @InjectMocks
    private EvaluationRefreshScheduler scheduler;

    private EvaluationGlobale evaluation1;
    private EvaluationGlobale evaluation2;

    @BeforeEach
    void setUp() {
        evaluation1 = new EvaluationGlobale();
        evaluation1.setIdEvalGlobale(1L);
        evaluation1.setFormationId(10L);
        evaluation1.setCommentaireGeneral("Evaluation 1");
        evaluation1.setNoteGlobale(15.0f);

        evaluation2 = new EvaluationGlobale();
        evaluation2.setIdEvalGlobale(2L);
        evaluation2.setFormationId(20L);
        evaluation2.setCommentaireGeneral("Evaluation 2");
        evaluation2.setNoteGlobale(18.0f);
    }

    @Test
    @DisplayName("refreshEvaluations - Met à jour la date de rafraîchissement pour toutes les évaluations")
    void shouldUpdateRefreshDateForAllEvaluations() {
        // Given
        List<EvaluationGlobale> evaluations = Arrays.asList(evaluation1, evaluation2);
        when(evaluationGlobaleRepository.findAll()).thenReturn(evaluations);

        // When
        scheduler.refreshEvaluations();

        // Then
        verify(evaluationGlobaleRepository, times(1)).findAll();
        verify(evaluationGlobaleRepository, times(1)).save(evaluation1);
        verify(evaluationGlobaleRepository, times(1)).save(evaluation2);

        // Verify that lastRefreshDate was set for both evaluations
        assert evaluation1.getLastRefreshDate() != null : "lastRefreshDate should be set for evaluation1";
        assert evaluation2.getLastRefreshDate() != null : "lastRefreshDate should be set for evaluation2";
    }

    @Test
    @DisplayName("refreshEvaluations - Gère le cas où il n'y a aucune évaluation")
    void shouldHandleEmptyEvaluationsList() {
        // Given
        when(evaluationGlobaleRepository.findAll()).thenReturn(Arrays.asList());

        // When
        scheduler.refreshEvaluations();

        // Then
        verify(evaluationGlobaleRepository, times(1)).findAll();
        verify(evaluationGlobaleRepository, never()).save(any());
    }
}