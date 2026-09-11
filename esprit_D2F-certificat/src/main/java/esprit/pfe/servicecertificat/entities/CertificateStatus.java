package esprit.pfe.servicecertificat.entities;

/** Cycle de vie d'un certificat. */
public enum CertificateStatus {
    /** En attente de délivrance (critères d'éligibilité satisfaits, PDF non remis). */
    PENDING,
    /** Délivré et valide. */
    ISSUED,
    /** Révoqué par un administrateur (fraude, erreur, etc.). */
    REVOKED
}
