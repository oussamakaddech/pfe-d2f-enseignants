package esprit.pfe.serviceanalyse.dto.passport;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Résumé d'un domaine de compétences maîtrisé par l'enseignant.
 * Exemple JSON :
 * { "domaineId": 2, "nom": "Informatique", "scoreGlobal": 3.2,
 *   "totalSavoirs": 12, "competences": [...] }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DomainSummaryDTO {
    private Long domaineId;
    private String nom;
    private double scoreGlobal;
    private int totalSavoirs;
    private List<CompetenceSummaryDTO> competences;
}
