package esprit.pfe.serviceanalyse.service.client;

import esprit.pfe.serviceanalyse.dto.passport.CompetenceSummaryDTO;
import esprit.pfe.serviceanalyse.dto.passport.DomainSummaryDTO;
import esprit.pfe.serviceanalyse.dto.passport.SavoirSummaryDTO;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.*;

/**
 * Client REST vers le service-compétence (port 8005).
 *
 * API consommée :
 *   GET /api/v1/enseignant-competences/enseignant/{enseignantId}
 *   → List<EnseignantCompetenceDTO> :
 *       id, enseignantId, savoirId, savoirNom, savoirCode,
 *       sousCompetenceNom, competenceNom, domaineNom, niveau, dateAcquisition
 *
 * JWT forwarding : le token de l'utilisateur connecté est forwardé pour que
 * le service-compétence puisse valider les droits d'accès.
 */
@Slf4j
@Component
public class CompetenceServiceClient {

    private static final String NIVEAU_KEY = "niveau";

    private final RestTemplate restTemplate;

    @Value("${services.competence.url}")
    private String competenceServiceUrl;

    public CompetenceServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @SuppressWarnings("unchecked")
    @CircuitBreaker(name = "competence-cb", fallbackMethod = "getDomainSummariesFallback")
    public List<DomainSummaryDTO> getDomainSummaries(String enseignantId, String bearerToken) {
        String url = competenceServiceUrl + "/api/v1/enseignant-competences/enseignant/" + enseignantId;
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> affectations = (List<Map<String, Object>>) (List<?>) RestClientHelper.getAuthenticated(restTemplate, url, bearerToken, List.class);
        if (affectations == null || affectations.isEmpty()) return Collections.emptyList();
        return buildDomains(affectations);
    }

    /**
     * Fallback CircuitBreaker : retourne une liste vide (données partielles)
     * plutôt qu'une exception cascade.
     */
    @SuppressWarnings("unused")
    private List<DomainSummaryDTO> getDomainSummariesFallback(String enseignantId, String bearerToken, Throwable t) {
        log.warn("CircuitBreaker [competence-cb] fallback pour enseignant={} : {}", enseignantId, t.getMessage());
        return Collections.emptyList();
    }

    private List<DomainSummaryDTO> buildDomains(List<Map<String, Object>> affectations) {
        Map<String, Map<String, List<Map<String, Object>>>> byDomainByComp = new LinkedHashMap<>();

        for (Map<String, Object> aff : affectations) {
            String domaine = str(aff.get("domaineNom"), "Domaine inconnu");
            String competence = str(aff.get("competenceNom"), "Compétence inconnue");
            byDomainByComp
                    .computeIfAbsent(domaine, k -> new LinkedHashMap<>())
                    .computeIfAbsent(competence, k -> new ArrayList<>())
                    .add(aff);
        }

        List<DomainSummaryDTO> domains = new ArrayList<>();
        for (Map.Entry<String, Map<String, List<Map<String, Object>>>> domEntry : byDomainByComp.entrySet()) {
            List<CompetenceSummaryDTO> competences = new ArrayList<>();
            int totalSavoirs = 0;
            double totalNiveau = 0;
            int countNiveau = 0;

            for (Map.Entry<String, List<Map<String, Object>>> compEntry : domEntry.getValue().entrySet()) {
                List<SavoirSummaryDTO> savoirs = new ArrayList<>();
                double compNiveauSum = 0;

                for (Map<String, Object> aff : compEntry.getValue()) {
                    int niveauNum = parseNiveauToInt(aff.get(NIVEAU_KEY));
                    savoirs.add(SavoirSummaryDTO.builder()
                            .savoirId(toLong(aff.get("savoirId")))
                            .code(str(aff.get("savoirCode"), ""))
                            .nom(str(aff.get("savoirNom"), "Savoir sans nom"))
                            .type(inferTypeSavoir(aff.get("savoirCode")))
                            .niveau(str(aff.get(NIVEAU_KEY), "N1_DEBUTANT"))
                            .niveauLabel(niveauLabel(aff.get(NIVEAU_KEY)))
                            .niveauNumeric(niveauNum)
                            .dateAcquisition(parseDate(aff.get("dateAcquisition")))
                            .build());
                    compNiveauSum += niveauNum;
                    totalNiveau += niveauNum;
                    countNiveau++;
                }
                totalSavoirs += savoirs.size();

                String sousCompNom = compEntry.getValue().isEmpty() ? null
                        : str(compEntry.getValue().get(0).get("sousCompetenceNom"), null);

                competences.add(CompetenceSummaryDTO.builder()
                        .nom(compEntry.getKey())
                        .sousCompetenceNom(sousCompNom)
                        .niveauMoyen(savoirs.isEmpty() ? 0 : round2(compNiveauSum / savoirs.size()))
                        .savoirs(savoirs)
                        .build());
            }

            double scoreGlobal = countNiveau == 0 ? 0 : round2(totalNiveau / countNiveau);
            domains.add(DomainSummaryDTO.builder()
                    .nom(domEntry.getKey())
                    .scoreGlobal(scoreGlobal)
                    .totalSavoirs(totalSavoirs)
                    .competences(competences)
                    .build());
        }
        return domains;
    }

    private int parseNiveauToInt(Object niveau) {
        if (niveau == null) return 1;
        String s = String.valueOf(niveau).toUpperCase();
        if (s.startsWith("N1")) return 1;
        if (s.startsWith("N2")) return 2;
        if (s.startsWith("N3")) return 3;
        if (s.startsWith("N4")) return 4;
        if (s.startsWith("N5")) return 5;
        try { return Integer.parseInt(s); } catch (Exception ignored) { return 1; }
    }

    private String niveauLabel(Object niveau) {
        if (niveau == null) return "N1 – Débutant";
        String s = String.valueOf(niveau).toUpperCase();
        if (s.startsWith("N1")) return "N1 – Débutant";
        if (s.startsWith("N2")) return "N2 – Élémentaire";
        if (s.startsWith("N3")) return "N3 – Intermédiaire";
        if (s.startsWith("N4")) return "N4 – Avancé";
        if (s.startsWith("N5")) return "N5 – Expert";
        return s;
    }

    private String inferTypeSavoir(Object code) {
        if (code == null) return "SAVOIR";
        String c = String.valueOf(code).toUpperCase();
        if (c.contains("SF") || c.contains("FAIRE")) return "SAVOIR_FAIRE";
        if (c.contains("SE") || c.contains("ETRE")) return "SAVOIR_ETRE";
        return "SAVOIR";
    }

    private LocalDate parseDate(Object dateObj) {
        if (dateObj == null) return null;
        try { return LocalDate.parse(String.valueOf(dateObj)); } catch (Exception ignored) { return null; }
    }

    private Long toLong(Object obj) {
        if (obj instanceof Number n) return n.longValue();
        return null;
    }

    private String str(Object o, String defaultVal) {
        if (o == null) return defaultVal;
        String s = String.valueOf(o);
        return (s.isBlank() || "null".equals(s)) ? defaultVal : s;
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
