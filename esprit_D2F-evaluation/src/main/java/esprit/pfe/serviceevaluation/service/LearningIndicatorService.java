package esprit.pfe.serviceevaluation.service;

import esprit.pfe.serviceevaluation.dto.CompetencyProgressionDTO;
import esprit.pfe.serviceevaluation.dto.LearningIndicatorDTO;
import esprit.pfe.serviceevaluation.dto.LearningTrainingIndicatorsDTO;
import esprit.pfe.serviceevaluation.entities.LearningAssessment;
import esprit.pfe.serviceevaluation.entities.LearningAssessmentType;
import esprit.pfe.serviceevaluation.repositories.LearningAssessmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service pour calculer les indicateurs d'apprentissage (Task 5).
 * Fournit:
 * - pre_score, post_score (scores pré et post tests)
 * - progression_rate (amélioration %)
 * - level_change (changement de niveau)
 * - attempt_count (nombre de tentatives)
 */
@Service
@RequiredArgsConstructor
public class LearningIndicatorService {

    private final LearningAssessmentRepository learningAssessmentRepository;

    /**
     * Calcule les indicateurs d'apprentissage pour un participant à une formation.
     * 
     * @param trainingId L'ID de la formation
     * @param participantId L'ID du participant
     * @return LearningIndicatorDTO avec tous les indicateurs calculés
     */
    public LearningIndicatorDTO calculateLearningIndicators(Long trainingId, String participantId) {
        List<LearningAssessment> assessments = learningAssessmentRepository
                .findByTrainingIdAndParticipantId(trainingId, participantId);

        if (assessments.isEmpty()) {
            return LearningIndicatorDTO.builder()
                    .trainingId(trainingId)
                    .participantId(participantId)
                    .preScore(null)
                    .postScore(null)
                    .progressionRate(null)
                    .levelChange(null)
                    .attemptCount(0)
                    .build();
        }

        // Séparer pré et post tests
        LearningAssessment preAssessment = assessments.stream()
                .filter(a -> a.getType() == LearningAssessmentType.PRE)
                .findFirst()
                .orElse(null);

        LearningAssessment postAssessment = assessments.stream()
                .filter(a -> a.getType() == LearningAssessmentType.POST)
                .sorted((a1, a2) -> Integer.compare(
                        a2.getAttemptNumber() != null ? a2.getAttemptNumber() : 0,
                        a1.getAttemptNumber() != null ? a1.getAttemptNumber() : 0))
                .findFirst()
                .orElse(null);

        Float preScore = preAssessment != null ? preAssessment.getScore() : null;
        Float postScore = postAssessment != null ? postAssessment.getScore() : null;

        // Progression normalisée : (post% − pre%) sur la même échelle (max_score).
        Double progressionRate = null;
        if (preScore != null && postScore != null) {
            Float preMax = preAssessment.getMaxScore() != null && preAssessment.getMaxScore() > 0
                    ? preAssessment.getMaxScore() : 100f;
            Float postMax = postAssessment.getMaxScore() != null && postAssessment.getMaxScore() > 0
                    ? postAssessment.getMaxScore() : 100f;
            double prePct = preScore * 100.0 / preMax;
            double postPct = postScore * 100.0 / postMax;
            progressionRate = postPct - prePct;
        }

        // Changement de niveau
        String levelChange = null;
        if (preAssessment != null && postAssessment != null) {
            String levelBefore = preAssessment.getLevelAfter() != null ? 
                    preAssessment.getLevelAfter() : preAssessment.getLevelBefore();
            String levelAfter = postAssessment.getLevelAfter();
            
            if (levelBefore != null && levelAfter != null && !levelBefore.equals(levelAfter)) {
                levelChange = levelBefore + " → " + levelAfter;
            }
        }

        // Total de tentatives
        int attemptCount = assessments.stream()
                .map(a -> a.getAttemptNumber() != null ? a.getAttemptNumber() : 0)
                .max(Integer::compareTo)
                .orElse(0);

        return LearningIndicatorDTO.builder()
                .trainingId(trainingId)
                .participantId(participantId)
                .preScore(preScore)
                .postScore(postScore)
                .progressionRate(progressionRate)
                .levelChange(levelChange)
                .attemptCount(attemptCount)
                .preLevel(preAssessment != null ? preAssessment.getLevelBefore() : null)
                .postLevel(postAssessment != null ? postAssessment.getLevelAfter() : null)
                .build();
    }

    /**
     * Calcule les indicateurs pour tous les participants d'une formation.
     */
    public Map<String, LearningIndicatorDTO> calculateAllParticipantLearningIndicators(Long trainingId) {
        List<LearningAssessment> allAssessments = learningAssessmentRepository
                .findByTrainingId(trainingId);
        
        return allAssessments.stream()
                .map(LearningAssessment::getParticipantId)
                .distinct()
                .collect(Collectors.toMap(
                        participantId -> participantId,
                        participantId -> calculateLearningIndicators(trainingId, participantId)
                ));
    }

    /**
     * Vérifie si un participant a un score post-test >= au seuil minimum.
     * 
     * @param trainingId L'ID de la formation
     * @param participantId L'ID du participant
     * @param minScore Score minimum requis (ex: 50 sur 100)
     * @return true si le score post >= minScore, false sinon
     */
    public boolean meetsPostTestThreshold(Long trainingId, String participantId, Float minScore) {
        LearningIndicatorDTO indicators = calculateLearningIndicators(trainingId, participantId);
        return indicators.getPostScore() != null && indicators.getPostScore() >= minScore;
    }

    /**
     * Calcule la progression moyenne pour une formation.
     */
    public Double calculateAverageProgression(Long trainingId) {
        Map<String, LearningIndicatorDTO> allIndicators = 
                calculateAllParticipantLearningIndicators(trainingId);
        
        return allIndicators.values().stream()
                .filter(i -> i.getProgressionRate() != null)
                .mapToDouble(LearningIndicatorDTO::getProgressionRate)
                .average()
                .orElse(0.0);
    }

    // ── Indicateurs agrégés par formation (étape 7 : Apprentissage) ──────

    /** Score en pourcentage du score maximal (défaut : 100). */
    private double percentage(LearningAssessment a) {
        Float max = a.getMaxScore() != null && a.getMaxScore() > 0 ? a.getMaxScore() : 100f;
        return a.getScore() != null ? a.getScore() * 100.0 / max : 0.0;
    }

    private Map<String, LearningAssessment> latestByParticipant(List<LearningAssessment> assessments) {
        Map<String, LearningAssessment> latest = new LinkedHashMap<>();
        for (LearningAssessment a : assessments) {
            LearningAssessment existing = latest.get(a.getParticipantId());
            if (existing == null || (a.getAttemptNumber() != null
                    && existing.getAttemptNumber() != null
                    && a.getAttemptNumber() > existing.getAttemptNumber())) {
                latest.put(a.getParticipantId(), a);
            }
        }
        return latest;
    }

    /**
     * Indicateurs d'apprentissage agrégés pour une formation :
     * score moyen avant, score moyen après, progression moyenne,
     * % ayant atteint le niveau cible, taux de réponse.
     */
    @Transactional(readOnly = true)
    public LearningTrainingIndicatorsDTO calculateTrainingIndicators(Long trainingId) {
        List<LearningAssessment> preList = learningAssessmentRepository
                .findByTrainingIdAndType(trainingId, LearningAssessmentType.PRE);
        List<LearningAssessment> postList = learningAssessmentRepository
                .findByTrainingIdAndType(trainingId, LearningAssessmentType.POST);

        Map<String, LearningAssessment> latestPre = latestByParticipant(preList);
        Map<String, LearningAssessment> latestPost = latestByParticipant(postList);

        Set<String> participants = new LinkedHashSet<>();
        participants.addAll(latestPre.keySet());
        participants.addAll(latestPost.keySet());

        Double avgPre = latestPre.isEmpty() ? null :
                latestPre.values().stream().mapToDouble(this::percentage).average().orElse(0.0);
        Double avgPost = latestPost.isEmpty() ? null :
                latestPost.values().stream().mapToDouble(this::percentage).average().orElse(0.0);

        List<Double> progressions = participants.stream()
                .filter(pid -> latestPre.containsKey(pid) && latestPost.containsKey(pid))
                .map(pid -> percentage(latestPost.get(pid)) - percentage(latestPre.get(pid)))
                .toList();
        Double avgProgression = progressions.isEmpty() ? null :
                progressions.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);

        long withPre = latestPre.size();
        long withPost = latestPost.size();
        Double responseRate = withPre == 0 ? 0.0 : (withPost * 100.0) / withPre;

        long targetReached = participants.stream()
                .map(pid -> latestPost.get(pid) != null ? latestPost.get(pid) : latestPre.get(pid))
                .filter(a -> Boolean.TRUE.equals(a.getTargetReached()))
                .count();
        Double targetReachedRate = participants.isEmpty() ? 0.0 :
                (targetReached * 100.0) / participants.size();

        return LearningTrainingIndicatorsDTO.builder()
                .trainingId(trainingId)
                .participantCount(participants.size())
                .averagePreScore(avgPre)
                .averagePostScore(avgPost)
                .averageProgression(avgProgression)
                .targetReachedRate(targetReachedRate)
                .responseRate(responseRate)
                .build();
    }

    /**
     * Progression par compétence (étape 6) : score avant / après / progression
     * pour chaque compétence ciblée par la formation. Alimente l'analyse prédictive.
     */
    @Transactional(readOnly = true)
    public List<CompetencyProgressionDTO> calculateCompetencyProgression(Long trainingId) {
        List<LearningAssessment> assessments = learningAssessmentRepository
                .findByTrainingIdAndCompetenceIdIsNotNull(trainingId);

        Map<Long, List<LearningAssessment>> byCompetence = assessments.stream()
                .filter(a -> a.getCompetenceId() != null)
                .collect(Collectors.groupingBy(
                        LearningAssessment::getCompetenceId, LinkedHashMap::new, Collectors.toList()));

        List<CompetencyProgressionDTO> result = new ArrayList<>();
        for (Map.Entry<Long, List<LearningAssessment>> entry : byCompetence.entrySet()) {
            Map<String, LearningAssessment> latestPre = latestByParticipant(entry.getValue().stream()
                    .filter(a -> a.getType() == LearningAssessmentType.PRE).toList());
            Map<String, LearningAssessment> latestPost = latestByParticipant(entry.getValue().stream()
                    .filter(a -> a.getType() == LearningAssessmentType.POST).toList());

            Set<String> participants = new LinkedHashSet<>();
            participants.addAll(latestPre.keySet());
            participants.addAll(latestPost.keySet());

            Double avgPre = latestPre.isEmpty() ? null :
                    latestPre.values().stream().mapToDouble(this::percentage).average().orElse(0.0);
            Double avgPost = latestPost.isEmpty() ? null :
                    latestPost.values().stream().mapToDouble(this::percentage).average().orElse(0.0);

            List<Double> progressions = participants.stream()
                    .filter(pid -> latestPre.containsKey(pid) && latestPost.containsKey(pid))
                    .map(pid -> percentage(latestPost.get(pid)) - percentage(latestPre.get(pid)))
                    .toList();
            Double avgProgression = progressions.isEmpty() ? null :
                    progressions.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);

            int targetReached = (int) participants.stream()
                    .map(pid -> latestPost.get(pid) != null ? latestPost.get(pid) : latestPre.get(pid))
                    .filter(a -> Boolean.TRUE.equals(a.getTargetReached()))
                    .count();

            result.add(CompetencyProgressionDTO.builder()
                    .trainingId(trainingId)
                    .competenceId(entry.getKey())
                    .participantCount(participants.size())
                    .averagePreScore(avgPre)
                    .averagePostScore(avgPost)
                    .averageProgression(avgProgression)
                    .targetReachedCount(targetReached)
                    .build());
        }
        return result;
    }

    /**
     * Score du post-test (dernière tentative) en pourcentage, ou null si absent.
     */
    @Transactional(readOnly = true)
    public Float getPostTestPercentage(Long trainingId, String participantId) {
        return learningAssessmentRepository
                .findFirstByParticipantIdAndTrainingIdAndTypeOrderByAttemptNumberDesc(
                        participantId, trainingId, LearningAssessmentType.POST)
                .map(this::percentage)
                .map(Double::floatValue)
                .orElse(null);
    }
}
