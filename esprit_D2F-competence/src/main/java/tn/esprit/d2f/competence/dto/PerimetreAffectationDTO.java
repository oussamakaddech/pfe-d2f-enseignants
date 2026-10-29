package tn.esprit.d2f.competence.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Périmètre d'affectation de l'utilisateur connecté.
 *
 * <p>Cet objet ne sert qu'à <b>filtrer l'affichage</b> (liste d'enseignants
 * proposés, tableau des affectations) : la décision d'autorisation reste
 * côté serveur, dans {@code AffectationScopeService}.</p>
 */
@Getter
@Setter
@EqualsAndHashCode
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerimetreAffectationDTO {

    /** Vrai pour un administrateur : aucune restriction. */
    private boolean global;

    /** UP du CUP ({@code __perimetre_indetermine__} si non configurée). */
    private String upId;

    /** Département du chef de département. */
    private String deptId;

    /** Identifiants des enseignants du périmètre (vide pour un administrateur). */
    private List<String> enseignantIds;
}
