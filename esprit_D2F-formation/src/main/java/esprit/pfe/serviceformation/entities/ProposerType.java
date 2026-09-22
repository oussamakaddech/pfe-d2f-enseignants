package esprit.pfe.serviceformation.entities;

/**
 * Type de personne proposée pour animer une formation.
 */
public enum ProposerType {
    /** Enseignant interne (fiche enseignant). */
    TEACHER,
    /** Animateur interne (enseignant avec rôle animateur). */
    ANIMATEUR,
    /** Formateur externe rattaché à un bureau. */
    EXTERNAL_TRAINER
}
