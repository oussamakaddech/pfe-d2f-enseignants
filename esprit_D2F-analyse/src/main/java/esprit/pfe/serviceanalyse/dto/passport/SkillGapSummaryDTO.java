package esprit.pfe.serviceanalyse.dto.passport;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Gap de compétence prioritaire détecté pour l'enseignant.
 * Exemple JSON :
 * { "competenceCode": "INF-001", "competenceLabel": "Programmation Python",
 *   "niveauActuel": 1, "niveauCible": 4, "gap": 3.0,
 *   "gravite": "élevée", "explication": "Écart de 3 niveau(x) — actuel: 1 / cible: 4" }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SkillGapSummaryDTO {
    private String competenceCode;
    private String competenceLabel;
    private int niveauActuel;
    private int niveauCible;
    private double gap;
    private String gravite;
    private String explication;
}
