package esprit.pfe.auth.payload.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Critères de récupération de résumés de comptes pour la page unifiée.
 * Tous les champs sont optionnels et se combinent en ET logique :
 * <ul>
 *   <li>{@code userIds} : enrichissement d'une page d'enseignants (jointure par id).</li>
 *   <li>{@code role} / {@code active} : pré-filtrage côté comptes — le service
 *       formation récupère les ids correspondants pour contraindre sa requête
 *       paginée (la pagination reste exacte côté enseignants).</li>
 * </ul>
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Schema(name = "AccountSummaryQuery", description = "Critères de filtrage des résumés de comptes")
public class AccountSummaryQuery {

    @Schema(description = "Liste d'identifiants de comptes à récupérer (enrichissement)")
    private List<String> userIds;

    @Schema(description = "Filtre par rôle principal",
            example = "ENSEIGNANT",
            allowableValues = {"ADMIN", "CUP", "ENSEIGNANT", "FORMATEUR", "ANIMATEUR",
                    "CHEF_DEPARTEMENT", "RESPONSABLE_DOSSIER"})
    private String role;

    @Schema(description = "Filtre par statut actif (true = actif)", example = "true")
    private Boolean active;
}
