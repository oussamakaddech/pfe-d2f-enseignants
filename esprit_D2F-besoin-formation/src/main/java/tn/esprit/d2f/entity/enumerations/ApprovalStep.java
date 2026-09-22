package tn.esprit.d2f.entity.enumerations;

/**
 * Étape courante du workflow d'approbation d'un besoin de formation.
 *
 * <ul>
 *   <li>{@code CUP} — en attente de validation CUP (besoins individuels)</li>
 *   <li>{@code CHEF_DEPARTEMENT} — en attente de validation chef de département</li>
 *   <li>{@code ADMIN} — en attente de validation finale administrateur</li>
 *   <li>{@code COMPLETED} — workflow terminé (formation créée)</li>
 *   <li>{@code REJECTED} — besoin refusé à une étape (terminal)</li>
 * </ul>
 */
public enum ApprovalStep {
    CUP,
    CHEF_DEPARTEMENT,
    ADMIN,
    COMPLETED,
    REJECTED
}
