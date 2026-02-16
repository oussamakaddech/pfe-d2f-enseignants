package esprit.pfe.serviceformation.messaging;



import lombok.*; import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor
public class EvaluationBatchMessage {
    private Long formationId;
    private List<EvaluationItem> evaluations;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class EvaluationItem {
        private String enseignantId;
        private Float  note;
        private Boolean satisfaisant;
        private String commentaire;
    }
}

