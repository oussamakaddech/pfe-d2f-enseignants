package esprit.pfe.serviceanalyse.dto.passport;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Recommandation de formation future pour combler les gaps identifiés.
 * Exemple JSON :
 * { "formationId": "42", "titre": "Deep Learning Fondamentaux",
 *   "duree": "30h", "competencesCiblees": ["ML", "Python"],
 *   "probabiliteReussite": 0.90, "priorite": "haute",
 *   "justification": "Formation ciblant des compétences en gap" }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecommendationSummaryDTO {
    private String formationId;
    private String titre;
    private String duree;
    private List<String> competencesCiblees;
    private double probabiliteReussite;
    private String priorite;
    private String justification;
}
