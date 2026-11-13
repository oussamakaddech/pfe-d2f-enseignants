package esprit.pfe.serviceevaluation.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Statistiques ANONYMES du questionnaire de satisfaction (aucun nom ni e-mail).
 *
 * @param totalReponses     nombre de réponses
 * @param aspects           par aspect : répartition des 5 niveaux (index 0 = niveau 1) et moyenne
 * @param besoinComplementaire nombre de « Oui » / « Non »
 * @param parFormation      réponses et moyenne générale par formation
 * @param parUp             nombre de réponses par UP
 * @param commentaires      remarques libres (formation, date, textes)
 */
public record FormationFeedbackStatsDTO(
        long totalReponses,
        Map<String, AspectStats> aspects,
        Map<String, Long> besoinComplementaire,
        List<FormationStats> parFormation,
        Map<String, Long> parUp,
        List<Commentaire> commentaires) {

    public record AspectStats(List<Long> repartition, Double moyenne) {}

    public record FormationStats(Long formationId, long reponses, Double moyenne) {}

    /** Réponse individuelle ANONYME (export Excel) : ni nom, ni e-mail, ni fiche. */
    public record Reponse(Long id, LocalDateTime date, Long formationId, String up,
                          Integer aspectOrganisationnel, Integer aspectTechnique, Integer aspectPedagogique,
                          Boolean besoinComplementaire, String autresInformations, String autresBesoins) {}

    public record Commentaire(Long formationId, LocalDateTime date, String autresInformations, String autresBesoins) {}
}
