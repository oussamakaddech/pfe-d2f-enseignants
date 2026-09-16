package esprit.pfe.serviceevaluation.messaging;



import esprit.pfe.serviceevaluation.dto.EvaluationFormateurDTO;
import esprit.pfe.serviceevaluation.services.EvaluationFormateurService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;

@Slf4j
@RequiredArgsConstructor @Service
public class EvaluationConsumer {

    private final EvaluationFormateurService evalService;

    /**
     * Pour la création en masse (« bulk create »)
     */
    @Retryable(
        retryFor = { esprit.pfe.serviceevaluation.exception.ResourceNotFoundException.class, Exception.class },
        maxAttempts = 3,
        backoff = @Backoff(delay = 30000)
    )
    @RabbitListener(queues = "evaluation.create.queue")
    public void onCreateBatch(EvaluationBatchMessage msg) {

        List<EvaluationFormateurDTO> dtos = msg.getEvaluations().stream()
                .map(item -> {
                    EvaluationFormateurDTO dto = new EvaluationFormateurDTO();
                    // dto.setIdEvalParticipant(...)  ← null ou absent pour un nouveau
                    dto.setFormationId(msg.getFormationId());
                    dto.setEnseignantId(item.getEnseignantId());
                    dto.setNote(item.getNote());
                    dto.setSatisfaisant(item.isSatisfaisant());
                    dto.setCommentaire(item.getCommentaire());
                    return dto;
                })
                .collect(Collectors.toList());

        evalService.createEvaluationsBulk(dtos);
    }

    @org.springframework.retry.annotation.Recover
    public void recover(Exception e, EvaluationBatchMessage msg) {
        log.error("ECHEC DEFINITIF - Envoi du message en DLQ pour la formationId={} | Erreur: {}", msg.getFormationId(), e.getMessage());
        throw new org.springframework.amqp.AmqpRejectAndDontRequeueException("Routage vers DLQ", e);
    }

    /**
     * Pour la mise à jour en masse (« bulk update »)
     */
    @Retryable(
        retryFor = { esprit.pfe.serviceevaluation.exception.ResourceNotFoundException.class, Exception.class },
        maxAttempts = 3,
        backoff = @Backoff(delay = 30000)
    )
    @RabbitListener(queues = "evaluation.update.queue")
    public void onUpdateBatch(EvaluationBatchMessage msg) {

        List<EvaluationFormateurDTO> dtos = msg.getEvaluations().stream()
                .map(item -> {
                    EvaluationFormateurDTO dto = new EvaluationFormateurDTO();
                    dto.setIdEvalParticipant(item.getIdEvalParticipant());
                    dto.setFormationId(msg.getFormationId());
                    dto.setEnseignantId(item.getEnseignantId());
                    dto.setNote(item.getNote());
                    dto.setSatisfaisant(item.isSatisfaisant());
                    dto.setCommentaire(item.getCommentaire());
                    return dto;
                })
                .collect(Collectors.toList());

        evalService.updateEvaluationsBulkByFormation(msg.getFormationId(), dtos);
    }
}
