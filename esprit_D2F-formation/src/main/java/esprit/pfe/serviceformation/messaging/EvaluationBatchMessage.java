package esprit.pfe.serviceformation.messaging;



import lombok.*; import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor
public class EvaluationBatchMessage {
    private Long formationId;
    private List<EvaluationItem> evaluations;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class EvaluationItem {
        /**
         * Id technique de l'évaluation (connu uniquement côté service
         * evaluation). Null à la création / à l'envoi : le consumer résout
         * par (formationId, enseignantId). Jamais obligatoire à l'émission.
         */
        private Long idEvalParticipant;
        private String enseignantId;
        private Float  note;
        private Boolean satisfaisant;
        private String commentaire;

        /** Raccourci d'émission sans id connu (résolution côté consumer). */
        public EvaluationItem(String enseignantId, Float note, Boolean satisfaisant, String commentaire) {
            this(null, enseignantId, note, satisfaisant, commentaire);
        }
    }
}

