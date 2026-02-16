package esprit.pfe.serviceevaluation.messaging;



import esprit.pfe.serviceevaluation.DTO.EvaluationFormateurDTO;
import esprit.pfe.serviceevaluation.Entities.EvaluationFormateur;
import esprit.pfe.serviceevaluation.Repositories.EvaluationFormateurRepository;
import esprit.pfe.serviceevaluation.Services.EvaluationFormateurService;
import lombok.RequiredArgsConstructor;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@RequiredArgsConstructor @Service
public class EvaluationConsumer {

    private final EvaluationFormateurService evalService;

    /**
     * Pour la création en masse (« bulk create »)
     */
    @JmsListener(destination = "evaluation.create.queue")
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

    /**
     * Pour la mise à jour en masse (« bulk update »)
     */
    @JmsListener(destination = "evaluation.update.queue")
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
