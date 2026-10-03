package esprit.pfe.serviceevaluation.service;

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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Tests de la cascade de compétences : progression pré/post, changement de
 * niveau, participants éligibles et batch.
 */
@ExtendWith(MockitoExtension.class)
class CompetenceCascadeServiceTest {

    @Mock
    private LearningAssessmentRepository repository;

    @InjectMocks
    private CompetenceCascadeService service;

    private LearningAssessment assessment(LearningAssessmentType type, String before,
                                          String after, int attempt) {
        LearningAssessment a = new LearningAssessment();
        a.setTrainingId(10001L);
        a.setParticipantId("P001");
        a.setType(type);
        a.setScore(60f);
        a.setMaxScore(100f);
        a.setLevelBefore(before);
        a.setLevelAfter(after);
        a.setAttemptNumber(attempt);
        return a;
    }

    @Test
    void updateParticipantCompetences_postTest_metAJourLeNiveau() {
        LearningAssessment post = assessment(LearningAssessmentType.POST, "A1", "A2", 1);
        when(repository.findByTrainingIdAndParticipantId(10001L, "P001"))
                .thenReturn(List.of(post));

        Map<Long, String> result = service.updateParticipantCompetences(10001L, "P001");

        // trainingId 10001 % 10000 = 1 → compétence 1 au niveau A2.
        assertEquals(1, result.size());
        assertEquals("A2", result.get(1L));
    }

    @Test
    void updateParticipantCompetences_sansPostTest_vide() {
        LearningAssessment pre = assessment(LearningAssessmentType.PRE, "A1", "A1", 1);
        when(repository.findByTrainingIdAndParticipantId(10001L, "P001"))
                .thenReturn(List.of(pre));

        assertTrue(service.updateParticipantCompetences(10001L, "P001").isEmpty());
    }

    @Test
    void updateParticipantCompetences_postSansNiveau_vide() {
        LearningAssessment post = assessment(LearningAssessmentType.POST, "A1", null, 1);
        when(repository.findByTrainingIdAndParticipantId(10001L, "P001"))
                .thenReturn(List.of(post));

        assertTrue(service.updateParticipantCompetences(10001L, "P001").isEmpty());
    }

    @Test
    void calculateLevelChange_preVersPost_formateFleche() {
        LearningAssessment pre = assessment(LearningAssessmentType.PRE, "A1", "A1", 1);
        LearningAssessment post = assessment(LearningAssessmentType.POST, "A1", "B1", 1);
        when(repository.findByTrainingIdAndParticipantId(10001L, "P001"))
                .thenReturn(List.of(pre, post));

        assertEquals("A1→B1", service.calculateLevelChange(10001L, "P001"));
    }

    @Test
    void calculateLevelChange_memeNiveau_null() {
        LearningAssessment pre = assessment(LearningAssessmentType.PRE, "A1", "A1", 1);
        LearningAssessment post = assessment(LearningAssessmentType.POST, "A1", "A1", 1);
        when(repository.findByTrainingIdAndParticipantId(10001L, "P001"))
                .thenReturn(List.of(pre, post));

        assertNull(service.calculateLevelChange(10001L, "P001"));
    }

    @Test
    void calculateLevelChange_sansPre_null() {
        LearningAssessment post = assessment(LearningAssessmentType.POST, "A1", "B1", 1);
        when(repository.findByTrainingIdAndParticipantId(10001L, "P001"))
                .thenReturn(List.of(post));

        assertNull(service.calculateLevelChange(10001L, "P001"));
    }

    @Test
    void getParticipantsWithCompletedPostTest_dedup() {
        LearningAssessment post1 = assessment(LearningAssessmentType.POST, "A1", "A2", 1);
        LearningAssessment post2 = assessment(LearningAssessmentType.POST, "A1", "A2", 2);
        LearningAssessment pre = assessment(LearningAssessmentType.PRE, "A1", "A1", 1);
        when(repository.findByTrainingId(10001L)).thenReturn(List.of(post1, post2, pre));

        List<String> result = service.getParticipantsWithCompletedPostTest(10001L);

        assertEquals(List.of("P001"), result);
    }

    @Test
    void updateAllParticipantsCompetences_batchParParticipant() {
        LearningAssessment post = assessment(LearningAssessmentType.POST, "A1", "A2", 1);
        when(repository.findByTrainingId(10001L)).thenReturn(List.of(post));
        when(repository.findByTrainingIdAndParticipantId(10001L, "P001"))
                .thenReturn(List.of(post));

        Map<String, Map<Long, String>> result = service.updateAllParticipantsCompetences(10001L);

        assertEquals(1, result.size());
        assertEquals("A2", result.get("P001").get(1L));
    }

    @Test
    void hasProgressed_progressionDetectee() {
        LearningAssessment pre = assessment(LearningAssessmentType.PRE, "A1", "A1", 1);
        LearningAssessment post = assessment(LearningAssessmentType.POST, "A1", "B1", 1);
        assertTrue(service.hasProgressed(pre, post));
    }

    @Test
    void hasProgressed_regressionOuNul_false() {
        LearningAssessment pre = assessment(LearningAssessmentType.PRE, "B1", "B1", 1);
        LearningAssessment post = assessment(LearningAssessmentType.POST, "B1", "A1", 1);
        assertFalse(service.hasProgressed(pre, post));
        assertFalse(service.hasProgressed(null, post));
        assertFalse(service.hasProgressed(pre, null));
    }

    @Test
    void hasProgressed_niveauxInconnus_ordreZero() {
        LearningAssessment pre = assessment(LearningAssessmentType.PRE, "X1", "X1", 1);
        LearningAssessment post = assessment(LearningAssessmentType.POST, "X1", "X2", 1);
        // X1 et X2 inconnus → ordre 0 des deux côtés → pas de progression stricte.
        assertFalse(service.hasProgressed(pre, post));
    }
}
