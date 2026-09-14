package esprit.pfe.serviceevaluation.services;

import esprit.pfe.serviceevaluation.dto.LearningAssessmentRequest;
import esprit.pfe.serviceevaluation.dto.LearningAssessmentResponse;
import esprit.pfe.serviceevaluation.entities.LearningAssessment;
import esprit.pfe.serviceevaluation.repositories.LearningAssessmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LearningAssessmentService {
    private final LearningAssessmentRepository repository;

    @Transactional
    public LearningAssessmentResponse submit(LearningAssessmentRequest request, String evaluatedBy) {
        validateScores(request);
        // Contrôle des tentatives : une seule évaluation par (participant, formation,
        // type, tentative). Sans numéro explicite, la dernière tentative existante est
        // mise à jour (pas de duplication d'évaluation finale non contrôlée).
        LearningAssessment latest = repository
                .findFirstByParticipantIdAndTrainingIdAndTypeOrderByAttemptNumberDesc(
                        request.getParticipantId(), request.getTrainingId(), request.getType())
                .orElse(null);
        ResolvedAttempt resolved = resolveAttempt(request.getAttemptNumber(), latest);
        LearningAssessment assessment = resolved.assessment();
        fillFromRequest(assessment, request, resolved.attempt(), evaluatedBy);
        return toResponse(repository.save(assessment));
    }

    /** Scores bornés par le score maximal (400/422 según règle métier). */
    private void validateScores(LearningAssessmentRequest request) {
        if (request.getScore() > request.getMaxScore()) {
            throw new IllegalArgumentException("Le score ne peut pas dépasser le score maximal.");
        }
        if (request.getAutoEvaluation() != null && request.getAutoEvaluation() > request.getMaxScore()) {
            throw new IllegalArgumentException("L'auto-évaluation ne peut pas dépasser le score maximal.");
        }
        if (request.getPracticalScore() != null && request.getPracticalScore() > request.getMaxScore()) {
            throw new IllegalArgumentException(
                    "Le score de l'exercice pratique ne peut pas dépasser le score maximal.");
        }
    }

    /** Tentative résolue : entité cible (existante ou nouvelle) + numéro validé. */
    private record ResolvedAttempt(LearningAssessment assessment, int attempt) {
    }

    private ResolvedAttempt resolveAttempt(Integer attempt, LearningAssessment latest) {
        if (attempt == null) {
            int resolved = latest != null ? latest.getAttemptNumber() : 1;
            return new ResolvedAttempt(latest != null ? latest : new LearningAssessment(), resolved);
        }
        if (latest != null && attempt < latest.getAttemptNumber()) {
            throw new IllegalArgumentException(
                    "Le numéro de tentative doit être >= à la dernière tentative enregistrée ("
                            + latest.getAttemptNumber() + ").");
        }
        LearningAssessment target = (latest != null && attempt.equals(latest.getAttemptNumber()))
                ? latest : new LearningAssessment();
        if (attempt < 1) {
            throw new IllegalArgumentException("Le numéro de tentative doit être positif.");
        }
        return new ResolvedAttempt(target, attempt);
    }

    private void fillFromRequest(LearningAssessment assessment, LearningAssessmentRequest request,
                                 int attempt, String evaluatedBy) {
        assessment.setTrainingId(request.getTrainingId());
        assessment.setSessionId(request.getSessionId());
        assessment.setParticipantId(request.getParticipantId());
        assessment.setType(request.getType());
        assessment.setScore(request.getScore());
        assessment.setMaxScore(request.getMaxScore());
        assessment.setLevelBefore(request.getLevelBefore());
        assessment.setLevelAfter(request.getLevelAfter());
        assessment.setCompetenceId(request.getCompetenceId());
        assessment.setTargetLevel(request.getTargetLevel());
        assessment.setAutoEvaluation(request.getAutoEvaluation());
        assessment.setObjectifsPersonnels(request.getObjectifsPersonnels());
        assessment.setPracticalScore(request.getPracticalScore());
        assessment.setTrainerComment(request.getTrainerComment());
        assessment.setCompetencesAcquises(request.getCompetencesAcquises());
        assessment.setTargetReached(request.getTargetReached());
        assessment.setAttemptNumber(attempt);
        assessment.setEvaluatedBy(evaluatedBy);
        assessment.setEvaluatedAt(LocalDateTime.now(ZoneId.systemDefault()));
    }

    @Transactional(readOnly = true)
    public List<LearningAssessmentResponse> findByTraining(Long trainingId) {
        return repository.findByTrainingId(trainingId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<LearningAssessmentResponse> findByParticipant(String participantId) {
        return repository.findByParticipantId(participantId).stream().map(this::toResponse).toList();
    }

    private LearningAssessmentResponse toResponse(LearningAssessment a) {
        LearningAssessmentResponse r = new LearningAssessmentResponse();
        r.setId(a.getId()); r.setTrainingId(a.getTrainingId()); r.setSessionId(a.getSessionId());
        r.setParticipantId(a.getParticipantId()); r.setType(a.getType()); r.setScore(a.getScore());
        r.setMaxScore(a.getMaxScore());
        r.setPercentage(a.getMaxScore() == null || a.getMaxScore() == 0 ? 0f : a.getScore() * 100f / a.getMaxScore());
        r.setLevelBefore(a.getLevelBefore()); r.setLevelAfter(a.getLevelAfter());
        r.setEvaluatedBy(a.getEvaluatedBy()); r.setEvaluatedAt(a.getEvaluatedAt());
        r.setAttemptNumber(a.getAttemptNumber());
        r.setCompetenceId(a.getCompetenceId()); r.setTargetLevel(a.getTargetLevel());
        r.setAutoEvaluation(a.getAutoEvaluation()); r.setObjectifsPersonnels(a.getObjectifsPersonnels());
        r.setPracticalScore(a.getPracticalScore()); r.setTrainerComment(a.getTrainerComment());
        r.setCompetencesAcquises(a.getCompetencesAcquises()); r.setTargetReached(a.getTargetReached());
        return r;
    }
}