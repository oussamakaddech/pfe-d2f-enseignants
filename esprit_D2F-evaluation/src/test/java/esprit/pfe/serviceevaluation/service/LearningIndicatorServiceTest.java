package esprit.pfe.serviceevaluation.service;

import esprit.pfe.serviceevaluation.dto.LearningIndicatorDTO;
import esprit.pfe.serviceevaluation.entities.LearningAssessment;
import esprit.pfe.serviceevaluation.entities.LearningAssessmentType;
import esprit.pfe.serviceevaluation.repositories.LearningAssessmentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Tests des indicateurs d'apprentissage : scores pré/post, progression,
 * changement de niveau, seuils et agrégats formation.
 */
@ExtendWith(MockitoExtension.class)
class LearningIndicatorServiceTest {

    @Mock
    private LearningAssessmentRepository repository;

    @InjectMocks
    private LearningIndicatorService service;

    private LearningAssessment assessment(LearningAssessmentType type, Float score, Float max,
                                          String before, String after, int attempt) {
        LearningAssessment a = new LearningAssessment();
        a.setTrainingId(1L);
        a.setParticipantId("P001");
        a.setType(type);
        a.setScore(score);
        a.setMaxScore(max);
        a.setLevelBefore(before);
        a.setLevelAfter(after);
        a.setAttemptNumber(attempt);
        return a;
    }

    @Test
    void calculate_sansEvaluations_retourneVide() {
        when(repository.findByTrainingIdAndParticipantId(1L, "P001")).thenReturn(List.of());

        LearningIndicatorDTO dto = service.calculateLearningIndicators(1L, "P001");

        assertEquals(1L, dto.getTrainingId());
        assertEquals("P001", dto.getParticipantId());
        assertNull(dto.getPreScore());
        assertNull(dto.getPostScore());
        assertNull(dto.getProgressionRate());
        assertNull(dto.getLevelChange());
        assertEquals(0, dto.getAttemptCount());
    }

    @Test
    void calculate_preEtPost_calculeProgressionEtNiveau() {
        LearningAssessment pre = assessment(LearningAssessmentType.PRE, 40f, 100f, "A1", "A1", 1);
        LearningAssessment post = assessment(LearningAssessmentType.POST, 70f, 100f, "A1", "A2", 2);
        when(repository.findByTrainingIdAndParticipantId(1L, "P001")).thenReturn(List.of(pre, post));

        LearningIndicatorDTO dto = service.calculateLearningIndicators(1L, "P001");

        assertEquals(40f, dto.getPreScore());
        assertEquals(70f, dto.getPostScore());
        assertEquals(30.0, dto.getProgressionRate());
        assertEquals("A1 → A2", dto.getLevelChange());
        assertEquals(2, dto.getAttemptCount());
        assertEquals("A1", dto.getPreLevel());
        assertEquals("A2", dto.getPostLevel());
    }

    @Test
    void calculate_niveauxIdentiques_pasDeChangement() {
        LearningAssessment pre = assessment(LearningAssessmentType.PRE, 40f, 100f, "A1", "A1", 1);
        LearningAssessment post = assessment(LearningAssessmentType.POST, 45f, 100f, "A1", "A1", 1);
        when(repository.findByTrainingIdAndParticipantId(1L, "P001")).thenReturn(List.of(pre, post));

        LearningIndicatorDTO dto = service.calculateLearningIndicators(1L, "P001");

        assertNull(dto.getLevelChange());
        assertEquals(5.0, dto.getProgressionRate());
    }

    @Test
    void calculate_postSeul_sansProgression() {
        LearningAssessment post = assessment(LearningAssessmentType.POST, 70f, 100f, null, "A2", 1);
        when(repository.findByTrainingIdAndParticipantId(1L, "P001")).thenReturn(List.of(post));

        LearningIndicatorDTO dto = service.calculateLearningIndicators(1L, "P001");

        assertNull(dto.getPreScore());
        assertEquals(70f, dto.getPostScore());
        assertNull(dto.getProgressionRate());
        assertNull(dto.getLevelChange());
    }

    @Test
    void calculate_maxScoresDifferents_normaliseEnPourcents() {
        // pré 40/80 (50%), post 70/100 (70%) → progression 20.
        LearningAssessment pre = assessment(LearningAssessmentType.PRE, 40f, 80f, "A1", "A1", 1);
        LearningAssessment post = assessment(LearningAssessmentType.POST, 70f, 100f, "A1", "A2", 1);
        when(repository.findByTrainingIdAndParticipantId(1L, "P001")).thenReturn(List.of(pre, post));

        LearningIndicatorDTO dto = service.calculateLearningIndicators(1L, "P001");

        assertEquals(20.0, dto.getProgressionRate(), 0.001);
    }

    @Test
    void calculate_tentativeMaxPost_retenue() {
        LearningAssessment post1 = assessment(LearningAssessmentType.POST, 50f, 100f, "A1", "A1", 1);
        LearningAssessment post2 = assessment(LearningAssessmentType.POST, 80f, 100f, "A1", "B1", 2);
        when(repository.findByTrainingIdAndParticipantId(1L, "P001"))
                .thenReturn(List.of(post1, post2));

        LearningIndicatorDTO dto = service.calculateLearningIndicators(1L, "P001");

        assertEquals(80f, dto.getPostScore());
        assertEquals("B1", dto.getPostLevel());
        assertEquals(2, dto.getAttemptCount());
    }

    @Test
    void meetsThreshold_postSuperieur_True() {
        LearningAssessment post = assessment(LearningAssessmentType.POST, 70f, 100f, null, "A2", 1);
        when(repository.findByTrainingIdAndParticipantId(1L, "P001")).thenReturn(List.of(post));

        assertTrue(service.meetsPostTestThreshold(1L, "P001", 50f));
        assertFalse(service.meetsPostTestThreshold(1L, "P001", 80f));
    }

    @Test
    void meetsThreshold_sansPost_false() {
        when(repository.findByTrainingIdAndParticipantId(1L, "P001")).thenReturn(List.of());

        assertFalse(service.meetsPostTestThreshold(1L, "P001", 50f));
    }

    @Test
    void averageProgression_moyenneDesProgressions() {
        LearningAssessment pre1 = assessment(LearningAssessmentType.PRE, 40f, 100f, "A1", "A1", 1);
        pre1.setParticipantId("P001");
        LearningAssessment post1 = assessment(LearningAssessmentType.POST, 60f, 100f, "A1", "A2", 1);
        post1.setParticipantId("P001");
        LearningAssessment pre2 = assessment(LearningAssessmentType.PRE, 30f, 100f, "A1", "A1", 1);
        pre2.setParticipantId("P002");
        LearningAssessment post2 = assessment(LearningAssessmentType.POST, 70f, 100f, "A1", "B1", 1);
        post2.setParticipantId("P002");
        when(repository.findByTrainingId(1L)).thenReturn(List.of(pre1, post1, pre2, post2));
        when(repository.findByTrainingIdAndParticipantId(1L, "P001")).thenReturn(List.of(pre1, post1));
        when(repository.findByTrainingIdAndParticipantId(1L, "P002")).thenReturn(List.of(pre2, post2));

        Double avg = service.calculateAverageProgression(1L);

        // (20 + 40) / 2 = 30.
        assertEquals(30.0, avg);
    }

    @Test
    void averageProgression_aucuneProgression_zero() {
        when(repository.findByTrainingId(1L)).thenReturn(List.of());

        assertEquals(0.0, service.calculateAverageProgression(1L));
    }

    @Test
    void allParticipants_mappeChaqueParticipant() {
        LearningAssessment pre = assessment(LearningAssessmentType.PRE, 40f, 100f, "A1", "A1", 1);
        when(repository.findByTrainingId(1L)).thenReturn(List.of(pre));
        when(repository.findByTrainingIdAndParticipantId(1L, "P001")).thenReturn(List.of(pre));

        Map<String, LearningIndicatorDTO> result = service.calculateAllParticipantLearningIndicators(1L);

        assertEquals(1, result.size());
        assertTrue(result.containsKey("P001"));
    }

    // ── Agrégats formation ────────────────────────────────────────────

    private LearningAssessment trainingAssessment(String participant, LearningAssessmentType type,
                                                  Float score, boolean targetReached, Long competenceId) {
        LearningAssessment a = assessment(type, score, 100f, "A1", "A2", 1);
        a.setParticipantId(participant);
        a.setTargetReached(targetReached);
        a.setCompetenceId(competenceId);
        return a;
    }

    @Test
    void trainingIndicators_calculeLesAgregats() {
        LearningAssessment pre1 = trainingAssessment("P001", LearningAssessmentType.PRE, 40f, false, 10L);
        LearningAssessment post1 = trainingAssessment("P001", LearningAssessmentType.POST, 60f, true, 10L);
        LearningAssessment pre2 = trainingAssessment("P002", LearningAssessmentType.PRE, 30f, false, 10L);
        LearningAssessment post2 = trainingAssessment("P002", LearningAssessmentType.POST, 30f, false, 10L);
        when(repository.findByTrainingIdAndType(1L, LearningAssessmentType.PRE))
                .thenReturn(List.of(pre1, pre2));
        when(repository.findByTrainingIdAndType(1L, LearningAssessmentType.POST))
                .thenReturn(List.of(post1, post2));

        var dto = service.calculateTrainingIndicators(1L);

        assertEquals(1L, dto.getTrainingId());
        assertEquals(2, dto.getParticipantCount());
        // avgPre = (40+30)/2 = 35 ; avgPost = (60+30)/2 = 45 ; progression = (20+0)/2 = 10.
        assertEquals(35.0, dto.getAveragePreScore());
        assertEquals(45.0, dto.getAveragePostScore());
        assertEquals(10.0, dto.getAverageProgression());
        // 1 cible atteinte sur 2 → 50%.
        assertEquals(50.0, dto.getTargetReachedRate());
        // 2 post / 2 pré → 100%.
        assertEquals(100.0, dto.getResponseRate());
    }

    @Test
    void trainingIndicators_sansDonnees_nulls() {
        when(repository.findByTrainingIdAndType(1L, LearningAssessmentType.PRE))
                .thenReturn(List.of());
        when(repository.findByTrainingIdAndType(1L, LearningAssessmentType.POST))
                .thenReturn(List.of());

        var dto = service.calculateTrainingIndicators(1L);

        assertEquals(0, dto.getParticipantCount());
        assertNull(dto.getAveragePreScore());
        assertNull(dto.getAveragePostScore());
        assertNull(dto.getAverageProgression());
        assertEquals(0.0, dto.getTargetReachedRate());
        assertEquals(0.0, dto.getResponseRate());
    }

    @Test
    void competencyProgression_agregeParCompetence() {
        LearningAssessment pre = trainingAssessment("P001", LearningAssessmentType.PRE, 40f, false, 10L);
        LearningAssessment post = trainingAssessment("P001", LearningAssessmentType.POST, 60f, true, 10L);
        LearningAssessment other = trainingAssessment("P001", LearningAssessmentType.PRE, 50f, false, null);
        when(repository.findByTrainingIdAndCompetenceIdIsNotNull(1L))
                .thenReturn(List.of(pre, post, other));

        var result = service.calculateCompetencyProgression(1L);

        assertEquals(1, result.size());
        assertEquals(10L, result.get(0).getCompetenceId());
        assertEquals(1, result.get(0).getParticipantCount());
        assertEquals(40.0, result.get(0).getAveragePreScore());
        assertEquals(60.0, result.get(0).getAveragePostScore());
        assertEquals(20.0, result.get(0).getAverageProgression());
        assertEquals(1, result.get(0).getTargetReachedCount());
    }

    @Test
    void competencyProgression_sansDonnees_vide() {
        when(repository.findByTrainingIdAndCompetenceIdIsNotNull(1L))
                .thenReturn(List.of());

        assertTrue(service.calculateCompetencyProgression(1L).isEmpty());
    }

    @Test
    void postTestPercentage_scoreOuNull() {
        LearningAssessment post = assessment(LearningAssessmentType.POST, 70f, 100f, null, "A2", 1);
        when(repository.findFirstByParticipantIdAndTrainingIdAndTypeOrderByAttemptNumberDesc(
                "P001", 1L, LearningAssessmentType.POST)).thenReturn(Optional.of(post));

        assertEquals(70f, service.getPostTestPercentage(1L, "P001"));

        when(repository.findFirstByParticipantIdAndTrainingIdAndTypeOrderByAttemptNumberDesc(
                "P002", 1L, LearningAssessmentType.POST)).thenReturn(Optional.empty());
        assertNull(service.getPostTestPercentage(1L, "P002"));
    }
}
