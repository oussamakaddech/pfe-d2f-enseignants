package esprit.pfe.serviceevaluation.services;

import esprit.pfe.serviceevaluation.dto.LearningAssessmentRequest;
import esprit.pfe.serviceevaluation.dto.LearningAssessmentResponse;
import esprit.pfe.serviceevaluation.entities.LearningAssessment;
import esprit.pfe.serviceevaluation.entities.LearningAssessmentType;
import esprit.pfe.serviceevaluation.repositories.LearningAssessmentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Tests du service de soumission des évaluations pré/post.
 */
@ExtendWith(MockitoExtension.class)
class LearningAssessmentServiceTest {

    @Mock
    private LearningAssessmentRepository repository;

    @InjectMocks
    private LearningAssessmentService service;

    private LearningAssessmentRequest request(Float score, Float max, LearningAssessmentType type) {
        LearningAssessmentRequest r = new LearningAssessmentRequest();
        r.setTrainingId(1L);
        r.setParticipantId("P001");
        r.setType(type);
        r.setScore(score);
        r.setMaxScore(max);
        r.setLevelBefore("A1");
        r.setLevelAfter("A2");
        r.setCompetenceId(10L);
        r.setTargetLevel("B1");
        r.setAutoEvaluation(40f);
        r.setObjectifsPersonnels("Progresser");
        r.setPracticalScore(45f);
        r.setTrainerComment("Bien");
        r.setCompetencesAcquises("Java");
        r.setTargetReached(true);
        return r;
    }

    @Test
    void submit_premiereEvaluation_creeEtMappe() {
        when(repository.findFirstByParticipantIdAndTrainingIdAndTypeOrderByAttemptNumberDesc(
                "P001", 1L, LearningAssessmentType.PRE)).thenReturn(Optional.empty());
        when(repository.save(any(LearningAssessment.class))).thenAnswer(inv -> {
            LearningAssessment a = inv.getArgument(0);
            a.setId(1L);
            return a;
        });

        LearningAssessmentResponse response = service.submit(request(60f, 100f, LearningAssessmentType.PRE), "formateur-1");

        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals(60f, response.getScore());
        assertEquals(100f, response.getMaxScore());
        assertEquals(60f, response.getPercentage());
        assertEquals("A1", response.getLevelBefore());
        assertEquals("A2", response.getLevelAfter());
        assertEquals(1, response.getAttemptNumber());
        assertEquals("formateur-1", response.getEvaluatedBy());
        assertNotNull(response.getEvaluatedAt());
    }

    @Test
    void submit_sansNumeroTentative_metAJourLaDerniere() {
        LearningAssessment latest = new LearningAssessment();
        latest.setId(5L);
        latest.setAttemptNumber(2);
        latest.setScore(50f);
        latest.setMaxScore(100f);
        LearningAssessmentRequest r = request(70f, 100f, LearningAssessmentType.POST);
        r.setAttemptNumber(null);
        when(repository.findFirstByParticipantIdAndTrainingIdAndTypeOrderByAttemptNumberDesc(
                "P001", 1L, LearningAssessmentType.POST)).thenReturn(Optional.of(latest));
        when(repository.save(any(LearningAssessment.class))).thenAnswer(inv -> inv.getArgument(0));

        LearningAssessmentResponse response = service.submit(r, "formateur-1");

        assertEquals(2, response.getAttemptNumber());
        assertEquals(70f, response.getScore());
    }

    @Test
    void submit_tentativeAnterieure_leve400() {
        LearningAssessment latest = new LearningAssessment();
        latest.setAttemptNumber(3);
        LearningAssessmentRequest r = request(70f, 100f, LearningAssessmentType.POST);
        r.setAttemptNumber(2);
        when(repository.findFirstByParticipantIdAndTrainingIdAndTypeOrderByAttemptNumberDesc(
                "P001", 1L, LearningAssessmentType.POST)).thenReturn(Optional.of(latest));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.submit(r, "formateur-1"));
        assertTrue(ex.getMessage().contains("tentative"));
    }

    @Test
    void submit_tentativeZero_leve400() {
        LearningAssessmentRequest r = request(70f, 100f, LearningAssessmentType.POST);
        r.setAttemptNumber(0);
        when(repository.findFirstByParticipantIdAndTrainingIdAndTypeOrderByAttemptNumberDesc(
                "P001", 1L, LearningAssessmentType.POST)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.submit(r, "formateur-1"));
    }

    @Test
    void submit_scoreSuperieurMax_leve400() {
        LearningAssessmentRequest r = request(120f, 100f, LearningAssessmentType.PRE);
        assertThrows(IllegalArgumentException.class, () -> service.submit(r, "f"));
    }

    @Test
    void submit_autoEvaluationSuperieureMax_leve400() {
        LearningAssessmentRequest r = request(60f, 100f, LearningAssessmentType.PRE);
        r.setAutoEvaluation(150f);
        assertThrows(IllegalArgumentException.class, () -> service.submit(r, "f"));
    }

    @Test
    void submit_practicalScoreSuperieurMax_leve400() {
        LearningAssessmentRequest r = request(60f, 100f, LearningAssessmentType.POST);
        r.setPracticalScore(150f);
        assertThrows(IllegalArgumentException.class, () -> service.submit(r, "f"));
    }

    @Test
    void submit_nouvelleTentativeSuperieure_creeNouvelleEntite() {
        LearningAssessment latest = new LearningAssessment();
        latest.setId(5L);
        latest.setAttemptNumber(1);
        LearningAssessmentRequest r = request(70f, 100f, LearningAssessmentType.POST);
        r.setAttemptNumber(2);
        when(repository.findFirstByParticipantIdAndTrainingIdAndTypeOrderByAttemptNumberDesc(
                "P001", 1L, LearningAssessmentType.POST)).thenReturn(Optional.of(latest));
        when(repository.save(any(LearningAssessment.class))).thenAnswer(inv -> inv.getArgument(0));

        LearningAssessmentResponse response = service.submit(r, "formateur-1");

        assertEquals(2, response.getAttemptNumber());
    }

    @Test
    void submit_memeTentative_metAJourExistante() {
        LearningAssessment latest = new LearningAssessment();
        latest.setId(5L);
        latest.setAttemptNumber(2);
        LearningAssessmentRequest r = request(70f, 100f, LearningAssessmentType.POST);
        r.setAttemptNumber(2);
        when(repository.findFirstByParticipantIdAndTrainingIdAndTypeOrderByAttemptNumberDesc(
                "P001", 1L, LearningAssessmentType.POST)).thenReturn(Optional.of(latest));
        when(repository.save(any(LearningAssessment.class))).thenAnswer(inv -> inv.getArgument(0));

        LearningAssessmentResponse response = service.submit(r, "formateur-1");

        assertEquals(2, response.getAttemptNumber());
    }

    @Test
    void findByTraining_mappeLaListe() {
        LearningAssessment a = new LearningAssessment();
        a.setId(1L);
        a.setTrainingId(1L);
        a.setParticipantId("P001");
        a.setType(LearningAssessmentType.PRE);
        a.setScore(50f);
        a.setMaxScore(0f);
        when(repository.findByTrainingId(1L)).thenReturn(List.of(a));

        List<LearningAssessmentResponse> result = service.findByTraining(1L);

        assertEquals(1, result.size());
        // maxScore 0 → percentage 0 (garde-fou division).
        assertEquals(0f, result.get(0).getPercentage());
    }

    @Test
    void findByParticipant_mappeLaListe() {
        LearningAssessment a = new LearningAssessment();
        a.setId(2L);
        a.setScore(80f);
        a.setMaxScore(100f);
        when(repository.findByParticipantId("P001")).thenReturn(List.of(a));

        List<LearningAssessmentResponse> result = service.findByParticipant("P001");

        assertEquals(1, result.size());
        assertEquals(80f, result.get(0).getPercentage());
    }
}
