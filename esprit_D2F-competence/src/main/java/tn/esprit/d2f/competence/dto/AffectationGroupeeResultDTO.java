package tn.esprit.d2f.competence.dto;

import lombok.*;

import java.util.List;

/**
 * Résultat d'une affectation groupée : combien de savoirs étaient ciblés,
 * combien d'affectations ont été créées et combien existaient déjà.
 */
@Getter
@Setter
@EqualsAndHashCode
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AffectationGroupeeResultDTO {

    private String enseignantId;

    private Long competenceId;

    private Long sousCompetenceId;

    /** Nombre de savoirs ciblés par la demande (compétence / sous-compétence / liste). */
    private int total;

    /** Affectations réellement créées. */
    private int crees;

    /** Savoirs déjà affectés à cet enseignant (ignorés, niveau inchangé). */
    private int dejaAffectes;

    /** Identifiants des savoirs ciblés (utile au client pour rafraîchir son état). */
    private List<Long> savoirIds;
}
