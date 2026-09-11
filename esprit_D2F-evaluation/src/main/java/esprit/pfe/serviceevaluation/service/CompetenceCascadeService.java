package esprit.pfe.serviceevaluation.service;

import esprit.pfe.serviceevaluation.entities.LearningAssessment;
import esprit.pfe.serviceevaluation.entities.LearningAssessmentType;
import esprit.pfe.serviceevaluation.repositories.LearningAssessmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service pour la cascade de compétences (Task 8).
 * Met à jour la liste maître des compétences d'un participant en fonction de:
 * - Score post-test (progression de niveau)
 * - Changement de niveau (level_before → level_after)
 * - Completion des tests pré/post
 * 
 * Intègre avec le service Competence pour mettre à jour les master data.
 */
@Service
@RequiredArgsConstructor
public class CompetenceCascadeService {

    private final LearningAssessmentRepository learningAssessmentRepository;
    
    // Injection optionnelle du client Competence (si disponible)
    // private final CompetenceClient competenceClient;

    /**
     * Met à jour les compétences d'un participant en fonction de ses LearningAssessment.
     * 
     * @param trainingId L'ID de la formation
     * @param participantId L'ID du participant
     * @return Map des compétences mises à jour (competence_id -> new_level)
     */
    public Map<Long, String> updateParticipantCompetences(Long trainingId, String participantId) {
        List<LearningAssessment> assessments = learningAssessmentRepository
                .findByTrainingIdAndParticipantId(trainingId, participantId);

        Map<Long, String> updatedCompetences = new HashMap<>();

        // Grouper par training (en cas de multi-trainings par assessment)
        assessments.stream()
                .collect(Collectors.groupingBy(LearningAssessment::getTrainingId))
                .forEach((trainingIdKey, trainingAssessments) -> {
                    // Récupérer le post-test le plus récent
                    LearningAssessment postAssessment = trainingAssessments.stream()
                            .filter(a -> a.getType() == LearningAssessmentType.POST)
                            .max(Comparator.comparing(a -> a.getAttemptNumber() != null ? a.getAttemptNumber() : 0))
                            .orElse(null);

                    if (postAssessment != null && postAssessment.getLevelAfter() != null) {
                        // Extraire l'ID compétence du training (convention: derniers 4 chiffres = comp_id)
                        Long competenceId = extractCompetenceId(trainingIdKey);
                        if (competenceId != null) {
                            updatedCompetences.put(competenceId, postAssessment.getLevelAfter());
                        }
                    }
                });

        // Appeler le client Competence pour persister les mises à jour
        if (!updatedCompetences.isEmpty()) {
            updateCompetencesMasterData(participantId, updatedCompetences);
        }

        return updatedCompetences;
    }

    /**
     * Calcule le changement de niveau pour une compétence.
     * Retourne: "A1→A2" ou null si pas de changement
     */
    public String calculateLevelChange(Long trainingId, String participantId, Long competenceId) {
        List<LearningAssessment> assessments = learningAssessmentRepository
                .findByTrainingIdAndParticipantId(trainingId, participantId);

        LearningAssessment preAssessment = assessments.stream()
                .filter(a -> a.getType() == LearningAssessmentType.PRE)
                .findFirst()
                .orElse(null);

        LearningAssessment postAssessment = assessments.stream()
                .filter(a -> a.getType() == LearningAssessmentType.POST)
                .max(Comparator.comparing(a -> a.getAttemptNumber() != null ? a.getAttemptNumber() : 0))
                .orElse(null);

        if (preAssessment == null || postAssessment == null) {
            return null;
        }

        String levelBefore = preAssessment.getLevelAfter() != null ? 
                preAssessment.getLevelAfter() : preAssessment.getLevelBefore();
        String levelAfter = postAssessment.getLevelAfter();

        if (levelBefore != null && levelAfter != null && !levelBefore.equals(levelAfter)) {
            return levelBefore + "→" + levelAfter;
        }

        return null;
    }

    /**
     * Retourne tous les participants avec au moins un post-test complété pour une formation.
     * Utile pour les mises à jour batch.
     */
    public List<String> getParticipantsWithCompletedPostTest(Long trainingId) {
        return learningAssessmentRepository.findByTrainingId(trainingId)
                .stream()
                .filter(a -> a.getType() == LearningAssessmentType.POST)
                .map(LearningAssessment::getParticipantId)
                .distinct()
                .collect(Collectors.toList());
    }

    /**
     * Mise à jour batch des compétences pour tous les participants d'une formation.
     */
    public Map<String, Map<Long, String>> updateAllParticipantsCompetences(Long trainingId) {
        return getParticipantsWithCompletedPostTest(trainingId)
                .stream()
                .collect(Collectors.toMap(
                        participantId -> participantId,
                        participantId -> updateParticipantCompetences(trainingId, participantId)
                ));
    }

    /**
     * Appelle le service Competence pour persister les mises à jour.
     * (Implémentation dépend du CompetenceClient disponible)
     */
    private void updateCompetencesMasterData(String participantId, Map<Long, String> competences) {
        // Note: Cette implémentation est une placeholder
        // À intégrer avec le CompetenceClient réel
        
        // Exemple:
        // competences.forEach((competenceId, newLevel) -> {
        //     competenceClient.updateParticipantCompetenceLevel(participantId, competenceId, newLevel);
        // });
        
        // Pour l'instant, just log
        System.out.printf("Updating competences for participant %s: %s%n", participantId, competences);
    }

    /**
     * Extrait l'ID compétence depuis l'ID formation (convention: derniers 4 chiffres).
     * Retourne null si extraction impossible.
     */
    private Long extractCompetenceId(Long trainingId) {
        if (trainingId == null) {
            return null;
        }
        // Convention simple: utiliser modulo sur trainingId
        // À adapter selon votre convention de mapping formation → compétence
        return trainingId % 10000;
    }

    /**
     * Vérifie si un participant a progressé dans une compétence.
     * Retourne true si level_after > level_before (selon ordre CEFR: A1 < A2 < B1 < B2 < C1 < C2)
     */
    public boolean hasProgressed(LearningAssessment preAssessment, LearningAssessment postAssessment) {
        if (preAssessment == null || postAssessment == null) {
            return false;
        }

        String levelBefore = preAssessment.getLevelAfter() != null ? 
                preAssessment.getLevelAfter() : preAssessment.getLevelBefore();
        String levelAfter = postAssessment.getLevelAfter();

        if (levelBefore == null || levelAfter == null) {
            return false;
        }

        return compareLevel(levelBefore, levelAfter) < 0;
    }

    /**
     * Compare deux niveaux de compétence (CEFR).
     * Retourne: -1 si level1 < level2, 0 si égal, 1 si level1 > level2
     */
    private int compareLevel(String level1, String level2) {
        Map<String, Integer> levelOrder = Map.of(
                "A1", 1, "A2", 2,
                "B1", 3, "B2", 4,
                "C1", 5, "C2", 6
        );

        Integer ord1 = levelOrder.getOrDefault(level1, 0);
        Integer ord2 = levelOrder.getOrDefault(level2, 0);

        return Integer.compare(ord1, ord2);
    }
}
