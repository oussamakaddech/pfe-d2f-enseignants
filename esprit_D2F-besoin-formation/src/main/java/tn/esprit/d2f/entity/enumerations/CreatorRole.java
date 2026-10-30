package tn.esprit.d2f.entity.enumerations;

/**
 * Rôle fonctionnel du créateur d'un besoin, figé à la création côté serveur
 * (déduit des autorités du JWT — jamais accepté depuis le frontend).
 *
 * <p>ANIMATEUR est assimilé à ENSEIGNANT (enseignant-animateur interne).</p>
 */
public enum CreatorRole {
    ENSEIGNANT,
    CUP,
    CHEF_DEPARTEMENT,
    ADMIN
}
