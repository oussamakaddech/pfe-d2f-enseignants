package tn.esprit.d2f.competence.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

import java.time.LocalDate;
import java.util.List;

/**
 * Affectation en masse : au moins un des trois périmètres doit être renseigné
 * ({@code competenceId}, {@code sousCompetenceId} ou {@code savoirIds}).
 *
 * <p>Décision fonctionnelle : affecter une compétence (ou une sous-compétence)
 * à un enseignant revient à lui affecter <b>tous</b> ses savoirs — la couverture
 * d'une compétence n'est jamais partielle. Les savoirs déjà affectés sont
 * conservés (aucun doublon, aucun écrasement de niveau).</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AffectationGroupeeRequest {

    @NotBlank(message = "L'identifiant de l'enseignant est obligatoire")
    private String enseignantId;

    /** Compétence entière : tous ses savoirs (directs et via sous-compétences). */
    private Long competenceId;

    /** Sous-compétence : ses savoirs et ceux de ses sous-compétences filles. */
    private Long sousCompetenceId;

    /** Liste explicite de savoirs (prioritaire sur les deux champs précédents). */
    private List<Long> savoirIds;

    /** Niveau appliqué à toutes les affectations créées (défaut : N1_DEBUTANT). */
    private NiveauMaitrise niveau;

    private LocalDate dateAcquisition;

    private String commentaire;
}
