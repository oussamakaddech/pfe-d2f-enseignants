package esprit.pfe.serviceformation.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Ce DTO contiendra le nombre de formations pour chaque TypeFormation
 * (INTERNE, EXTERNE, EN_LIGNE) selon les filtres appliqués.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FormationsByTypeDTO {
    private Long interne;   // nb de formations de type INTERNE
    private Long externe;   // nb de formations de type EXTERNE
    private Long enLigne;   // nb de formations de type EN_LIGNE
}
