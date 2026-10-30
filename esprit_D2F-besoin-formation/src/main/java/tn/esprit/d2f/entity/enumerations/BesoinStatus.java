package tn.esprit.d2f.entity.enumerations;

/**
 * Statut métier d'un besoin de formation.
 *
 * <p>Transitions :</p>
 * <ul>
 *   <li>Individuel : SUBMITTED → CUP_APPROVED → DEPARTMENT_APPROVED → ADMIN_APPROVED → FORMATION_CREATED</li>
 *   <li>Collectif CUP : SUBMITTED → DEPARTMENT_APPROVED → ADMIN_APPROVED → FORMATION_CREATED</li>
 *   <li>Collectif chef : SUBMITTED → ADMIN_APPROVED → FORMATION_CREATED</li>
 *   <li>Refus (toute étape non terminale) → REJECTED ; annulation créateur → CANCELLED</li>
 * </ul>
 */
public enum BesoinStatus {
    SUBMITTED,
    CUP_APPROVED,
    DEPARTMENT_APPROVED,
    ADMIN_APPROVED,
    FORMATION_CREATED,
    REJECTED,
    CANCELLED
}
