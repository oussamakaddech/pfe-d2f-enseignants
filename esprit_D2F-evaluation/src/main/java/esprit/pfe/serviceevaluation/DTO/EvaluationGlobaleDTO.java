package esprit.pfe.serviceevaluation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationGlobaleDTO {
    private Long idEvalGlobale;
    private Long formationId;
    private String commentaireGeneral;
    private LocalDate dateEvaluation;
    private Float noteGlobale;
    private String recommandation;
}
