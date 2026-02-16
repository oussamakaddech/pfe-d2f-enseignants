package esprit.pfe.serviceevaluation.messaging;

import lombok.*;

import java.util.List;

@Getter
@Setter
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationBatchMessage {
    private Long formationId;
    private List<EvaluationItem> evaluations;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class EvaluationItem {
        private Long   idEvalParticipant;
        private String enseignantId;

        private float  note;
        private boolean satisfaisant;
        private String commentaire;
    }
}
