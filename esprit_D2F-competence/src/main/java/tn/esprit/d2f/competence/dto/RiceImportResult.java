package tn.esprit.d2f.competence.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiceImportResult {

    private LocalDateTime generatedAt;

    private int domainesCreated;
    private int competencesCreated;
    private int sousCompetencesCreated;
    private int savoirsCreated;
    private int affectationsCreated;
    private int enseignantsCovered;

    /** Coverage per domaine: { domaineNom → % } */
    private Map<String, Double> tauxCouvertureParDomaine;

    private String message;
}
