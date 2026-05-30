package esprit.pfe.serviceanalyse.service.passport;

import esprit.pfe.serviceanalyse.dto.passport.*;
import esprit.pfe.serviceanalyse.services.AnalysePredictiveService;
import esprit.pfe.serviceanalyse.service.client.AuthServiceClient;
import esprit.pfe.serviceanalyse.service.client.CertificatServiceClient;
import esprit.pfe.serviceanalyse.service.client.CompetenceServiceClient;
import esprit.pfe.serviceanalyse.service.client.FormationServiceClient;
import esprit.pfe.serviceanalyse.service.passport.SkillPassportAuthorizationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Assemble le {@link TeacherSkillPassportDTO} en agrégeant les données
 * de tous les microservices concernés.
 *
 * Robustesse : chaque appel inter-service est isolé — l'absence d'un service
 * ne fait pas échouer l'ensemble (dégradation gracieuse).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SkillPassportAssembler {

    private final AuthServiceClient authClient;
    private final CompetenceServiceClient competenceClient;
    private final FormationServiceClient formationClient;
    private final CertificatServiceClient certificatClient;
    private final AnalysePredictiveService analysePredictiveService;
    private final SkillPassportAuthorizationService authorizationService;

    private static final DateTimeFormatter ISO_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    public TeacherSkillPassportDTO assemble(String enseignantUsername, Authentication authentication, String bearerToken) {
        log.info("Assemblage passeport pour enseignant={}", enseignantUsername);

        // ── 1. Identité enseignant ──────────────────────────────────────────
        // Optimisation : si l'utilisateur cherche son propre passeport, utiliser le JWT
        // au lieu de faire un appel HTTP vers auth (évite les 404 pour les users
        // authentifiés mais non-présents en base users d'auth)
        String currentUsername = authorizationService.extractUsername(authentication);
        TeacherIdentityDTO identity;
        if (currentUsername.equals(enseignantUsername)) {
            // Utilisateur cherche son propre passeport → extraire du JWT
            identity = authClient.getTeacherIdentityFromJwt(authentication);
        } else {
            // Admin/CUP cherche le passeport d'un autre → fetcher depuis auth
            identity = authClient.getTeacherIdentity(enseignantUsername, bearerToken);
        }

        // ── 2. Compétences agrégées par domaine ────────────────────────────
        List<DomainSummaryDTO> domaines = competenceClient.getDomainSummaries(enseignantUsername, bearerToken);

        // ── 3. Formations suivies ──────────────────────────────────────────
        List<TrainingHistoryDTO> formations = formationClient.getFormationsForTeacher(enseignantUsername, bearerToken);

        // ── 4. Certifications ──────────────────────────────────────────────
        List<CertificationSummaryDTO> certifications = certificatClient.getCertificationsForTeacher(enseignantUsername, bearerToken);

        // ── 5. Gaps & recommandations (service d'analyse local) ────────────
        // L'analyse complète (gaps + recommandations) est coûteuse : elle agrège
        // plusieurs microservices via HTTP. On l'exécute donc UNE SEULE fois et
        // on en dérive à la fois les gaps et les recommandations, au lieu de la
        // relancer deux fois.
        Map<String, Object> analyse = runAnalyse(enseignantUsername);
        List<SkillGapSummaryDTO> gaps = buildGaps(analyse);
        List<RecommendationSummaryDTO> recommandations = buildRecommandations(analyse);

        // ── 6. Indicateurs globaux ─────────────────────────────────────────
        int totalSavoirs = domaines.stream()
                .mapToInt(DomainSummaryDTO::getTotalSavoirs)
                .sum();

        double scoreGlobal = computeScoreGlobal(domaines, gaps);
        String statut = computeStatut(gaps);

        return TeacherSkillPassportDTO.builder()
                .identity(identity)
                .dateGeneration(LocalDateTime.now().format(ISO_FORMATTER))
                .scoreGlobal(round2(scoreGlobal))
                .statut(statut)
                .totalSavoirsMaitrises(totalSavoirs)
                .totalFormations(formations.size())
                .totalCertifications(certifications.size())
                .totalGaps(gaps.size())
                .domaines(domaines)
                .formations(formations)
                .certifications(certifications)
                .gaps(gaps)
                .recommandations(recommandations)
                .build();
    }

    /**
     * Exécute l'analyse prédictive complète une seule fois. En cas d'échec
     * (service indisponible), retourne une map vide → dégradation gracieuse :
     * les gaps et recommandations seront simplement vides.
     */
    private Map<String, Object> runAnalyse(String enseignantId) {
        try {
            Map<String, Object> analyse = analysePredictiveService.analyserEnseignant(enseignantId, null);
            return analyse != null ? analyse : Collections.emptyMap();
        } catch (Exception e) {
            log.warn("Analyse prédictive indisponible pour {} : {}", enseignantId, e.getMessage());
            return Collections.emptyMap();
        }
    }

    @SuppressWarnings("unchecked")
    private List<SkillGapSummaryDTO> buildGaps(Map<String, Object> analyse) {
        List<Map<String, Object>> rawGaps =
                (List<Map<String, Object>>) analyse.getOrDefault("gaps", Collections.emptyList());

        return rawGaps.stream().map(g -> SkillGapSummaryDTO.builder()
                .competenceCode(str(g.get("competenceCode")))
                .competenceLabel(str(g.get("competenceLabel")))
                .niveauActuel(toInt(g.get("niveauActuel")))
                .niveauCible(toInt(g.get("niveauCible")))
                .gap(toDouble(g.get("gap")))
                .gravite(str(g.get("gravite")))
                .explication(str(g.get("explication")))
                .build()
        ).collect(Collectors.toList());
    }

    @SuppressWarnings("unchecked")
    private List<RecommendationSummaryDTO> buildRecommandations(Map<String, Object> analyse) {
        List<Map<String, Object>> rawRecos =
                (List<Map<String, Object>>) analyse.getOrDefault("recommandationsFormations", Collections.emptyList());

        return rawRecos.stream()
                .filter(r -> !"N/A".equals(r.get("formationId")))
                .limit(5)
                .map(r -> RecommendationSummaryDTO.builder()
                        .formationId(str(r.get("formationId")))
                        .titre(str(r.get("titre")))
                        .duree(str(r.get("dureeEstimee")))
                        .competencesCiblees(toStringList(r.get("competencesCiblees")))
                        .probabiliteReussite(toDouble(r.get("probabiliteReussite")))
                        .priorite(str(r.get("priorite")))
                        .justification(str(r.get("justification")))
                        .build()
                ).collect(Collectors.toList());
    }

    private double computeScoreGlobal(List<DomainSummaryDTO> domaines, List<SkillGapSummaryDTO> gaps) {
        if (domaines.isEmpty()) return 0.0;
        double avgDomain = domaines.stream()
                .mapToDouble(DomainSummaryDTO::getScoreGlobal)
                .average().orElse(0.0);
        // Pénalité légère par gap grave
        long gapsGraves = gaps.stream()
                .filter(g -> "élevée".equals(g.getGravite()) || "elevee".equals(g.getGravite()))
                .count();
        return Math.max(1.0, avgDomain - (gapsGraves * 0.2));
    }

    private String computeStatut(List<SkillGapSummaryDTO> gaps) {
        boolean hasHighGap = gaps.stream()
                .anyMatch(g -> "élevée".equals(g.getGravite()) || "elevee".equals(g.getGravite()));
        if (hasHighGap) return "à_risque";
        if (!gaps.isEmpty()) return "en_progression";
        return "maîtrisé";
    }

    @SuppressWarnings("unchecked")
    private List<String> toStringList(Object obj) {
        if (obj instanceof List) return (List<String>) obj;
        return Collections.emptyList();
    }

    private String str(Object o) {
        return o != null ? String.valueOf(o) : "";
    }

    private int toInt(Object o) {
        if (o instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(o)); } catch (Exception e) { return 0; }
    }

    private double toDouble(Object o) {
        if (o instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(String.valueOf(o)); } catch (Exception e) { return 0.0; }
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
