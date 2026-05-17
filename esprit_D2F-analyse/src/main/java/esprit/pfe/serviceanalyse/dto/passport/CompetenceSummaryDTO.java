package esprit.pfe.serviceanalyse.dto.passport;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Résumé d'une compétence avec ses sous-compétences et savoirs associés.
 * Exemple JSON :
 * { "competenceId": 1, "nom": "Développement logiciel", "sousCompetenceNom": "POO",
 *   "niveauMoyen": 3.5, "savoirs": [...] }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CompetenceSummaryDTO {
    private Long competenceId;
    private String nom;
    private String sousCompetenceNom;
    private double niveauMoyen;
    private List<SavoirSummaryDTO> savoirs;
}
