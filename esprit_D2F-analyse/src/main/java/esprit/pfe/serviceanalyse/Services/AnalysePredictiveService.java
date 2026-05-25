package esprit.pfe.serviceanalyse.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AnalysePredictiveService {

    private static final String NIVEAU_MAITRISE = "niveauMaitrise";
    private static final String COMPETENCE = "competence";
    private static final String COMPETENCE_NOM = "competenceNom";
    private static final String COMPETENCE_ID = "competenceId";
    private static final String COMPETENCE_CODE = "competenceCode";
    private static final String FORMATION_ID = "formationId";
    private static final String TITRE = "titre";
    private static final String GRAVITE = "gravite";
    private static final String GRAVITE_ELEVEE = "elevee";
    private static final String GRAVITE_MOYENNE = "moyenne";
    private static final String GRAVITE_FAIBLE = "faible";
    private static final String MOYENNE = "moyenne";
    private static final String EXPLICATION = "explication";
    private static final String PRIORITE_HAUTE = "haute";
    private static final String PRIORITE = "priorite";
    private static final String EVALUATIONS_GLOBALES = "/evaluation/evaluations-globales";
    private static final String TOTAL_EVALUATIONS = "totalEvaluations";
    private static final String NOTE_MOYENNE = "noteMoyenne";

    private final RestTemplate restTemplate;

    public AnalysePredictiveService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Value("${services.evaluation.url}")
    private String evaluationServiceUrl;

    @Value("${services.formation.url}")
    private String formationServiceUrl;

    @Value("${services.competence.url}")
    private String competenceServiceUrl;

    @Value("${services.besoin-formation.url}")
    private String besoinFormationServiceUrl;

    /**
     * Analyse complète d'un enseignant : gaps, recommandations, besoins, dashboard.
     */
    public Map<String, Object> analyserEnseignant(String enseignantId, Long competenceCible) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("enseignantId", enseignantId);
        result.put("competenceAnalysee", competenceCible != null ? "Analyse ciblée compétence " + competenceCible : "Analyse globale du profil");
        result.put("gaps", identifierGaps(enseignantId));
        result.put("recommandationsFormations", recommanderFormations(enseignantId, competenceCible));
        result.put("besoinsDetectes", detecterBesoins(enseignantId));
        result.put("dashboard", genererDashboardEnseignant(enseignantId));
        return result;
    }

    /**
     * Identifier les gaps de compétences d'un enseignant.
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> identifierGaps(String enseignantId) {
        List<Map<String, Object>> gaps = new ArrayList<>();
        try {
            String compUrl = competenceServiceUrl + "/api/v1/enseignant-competences/enseignant/" + enseignantId;
            List<Map<String, Object>> affectations = restTemplate.getForObject(compUrl, List.class);
            if (affectations != null) {
                for (Map<String, Object> aff : affectations) {
                    processGapAffectation(aff, gaps);
                }
            }
        } catch (Exception e) {
            log.warn("Service compétence indisponible pour gaps : {}", e.getMessage());
            gaps.addAll(identifierGapsViaEvaluations());
        }
        gaps.sort((a, b) -> {
            int orderA = getGraviteOrder(a.get(GRAVITE));
            int orderB = getGraviteOrder(b.get(GRAVITE));
            return orderB - orderA;
        });
        return gaps;
    }

    @SuppressWarnings("unchecked")
    private void processGapAffectation(Map<String, Object> aff, List<Map<String, Object>> gaps) {
        int niveauActuel = parseNiveau(aff.get(NIVEAU_MAITRISE));
        int niveauCible = 4;
        
        Object compObj = aff.get(COMPETENCE);
        String compNom = "Inconnu";
        Long compId = null;
        if (compObj instanceof Map) {
            Map<String, Object> compMap = (Map<String, Object>) compObj;
            compNom = String.valueOf(compMap.getOrDefault("nom", "Inconnu"));
            compId = compMap.get("id") != null ? ((Number) compMap.get("id")).longValue() : null;
        }

        double gapVal = (double) niveauCible - niveauActuel;
        if (gapVal > 0) {
            Map<String, Object> gap = new LinkedHashMap<>();
            gap.put(COMPETENCE_ID, compId);
            gap.put(COMPETENCE_CODE, aff.getOrDefault(COMPETENCE_CODE, "N/A"));
            gap.put("competenceLabel", compNom);
            gap.put("niveauActuel", niveauActuel);
            gap.put("niveauCible", niveauCible);
            gap.put("gap", gapVal);
            gap.put(GRAVITE, getGraviteValue(gapVal));
            gap.put(EXPLICATION, "Écart de " + gapVal + " niveau(x) — actuel: " + niveauActuel + " / cible: " + niveauCible);
            gaps.add(gap);
        }
    }

    private int getGraviteOrder(Object gravite) {
        if (GRAVITE_ELEVEE.equals(gravite)) return 3;
        if (GRAVITE_MOYENNE.equals(gravite)) return 2;
        return 1;
    }

    /**
     * Fallback : identifier gaps via les évaluations.
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> identifierGapsViaEvaluations() {
        List<Map<String, Object>> gaps = new ArrayList<>();
        try {
            String evalUrl = evaluationServiceUrl + EVALUATIONS_GLOBALES;
            List<Map<String, Object>> evals = restTemplate.getForObject(evalUrl, List.class);
            if (evals != null) {
                double avgNote = evals.stream()
                    .filter(e -> e.get("note") != null)
                    .mapToDouble(e -> ((Number) e.get("note")).doubleValue())
                    .average().orElse(3.0);
                double gapVal = Math.max(0, 3.0 - avgNote);
                if (gapVal > 0) {
                    Map<String, Object> gap = new LinkedHashMap<>();
                    gap.put(COMPETENCE_CODE, "EVAL-001");
                    gap.put("competenceLabel", "Compétence globale (basée évaluations)");
                    gap.put("niveauActuel", avgNote);
                    gap.put("niveauCible", 3.0);
                    gap.put("gap", gapVal);
                    gap.put(GRAVITE, gapVal >= 2 ? GRAVITE_ELEVEE : GRAVITE_MOYENNE);
                    gap.put(EXPLICATION, "Note moyenne des évaluations: " + String.format("%.1f", avgNote) + " / cible: 3.0");
                    gaps.add(gap);
                }
            }
        } catch (Exception ex) {
            log.warn("Service evaluation indisponible : {}", ex.getMessage());
        }
        return gaps;
    }

    /**
     * Recommander des formations adaptées aux gaps identifiés.
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> recommanderFormations(String enseignantId, Long competenceCible) {
        List<Map<String, Object>> recommandations = new ArrayList<>();
        try {
            Set<Long> competenceIdsAvecGap = getCompetenceIdsWithGap(enseignantId, competenceCible);
            String formUrl = formationServiceUrl + "/formations";
            List<Map<String, Object>> formations = restTemplate.getForObject(formUrl, List.class);
            if (formations != null) {
                int ordre = 1;
                for (Map<String, Object> formation : formations) {
                    processFormationRecommendation(formation, competenceIdsAvecGap, recommandations, ordre++);
                }
            }
            recommandations.sort((a, b) -> PRIORITE_HAUTE.equals(a.get(PRIORITE)) ? -1 : 1);
        } catch (Exception e) {
            log.warn("Service formation indisponible : {}", e.getMessage());
            recommandations.add(createFallbackRecommendation());
        }
        return recommandations;
    }

    private Set<Long> getCompetenceIdsWithGap(String enseignantId, Long competenceCible) {
        if (competenceCible != null) {
            return Collections.singleton(competenceCible);
        }
        return identifierGaps(enseignantId).stream()
            .filter(g -> g.get(COMPETENCE_ID) != null)
            .map(g -> ((Number) g.get(COMPETENCE_ID)).longValue())
            .collect(Collectors.toSet());
    }

    @SuppressWarnings("unchecked")
    private void processFormationRecommendation(Map<String, Object> formation, Set<Long> gaps, List<Map<String, Object>> results, int ordre) {
        String etat = (String) formation.getOrDefault("etatFormation", "");
        if ("ANNULEE".equals(etat)) return;

        Long formationId = formation.get(FORMATION_ID) != null ? ((Number) formation.get(FORMATION_ID)).longValue() : null;
        List<String> competencesCiblees = new ArrayList<>();
        boolean cibleUnGap = checkFormationCibleGaps(formationId, gaps, competencesCiblees);

        Map<String, Object> reco = new LinkedHashMap<>();
        reco.put(FORMATION_ID, String.valueOf(formationId));
        reco.put(TITRE, formation.getOrDefault("titreFormation", "Sans titre"));
        reco.put("ordre", ordre);
        reco.put("dureeEstimee", formation.getOrDefault("chargeHoraireGlobal", 0) + "h");
        reco.put("competencesCiblees", competencesCiblees);
        reco.put("probabiliteReussite", calculateProbabilite(cibleUnGap, etat));
        reco.put("justification", cibleUnGap ? "Formation ciblant des compétences en gap" : "Formation " + etat);
        reco.put(PRIORITE, cibleUnGap ? PRIORITE_HAUTE : MOYENNE);
        results.add(reco);
    }

    @SuppressWarnings("unchecked")
    private boolean checkFormationCibleGaps(Long formationId, Set<Long> gaps, List<String> names) {
        if (formationId == null) return false;
        try {
            String fcUrl = formationServiceUrl + "/formation-competences/formation/" + formationId;
            List<Map<String, Object>> fcLinks = restTemplate.getForObject(fcUrl, List.class);
            if (fcLinks == null) return false;
            
            boolean match = false;
            for (Map<String, Object> fc : fcLinks) {
                Long compId = fc.get(COMPETENCE_ID) != null ? ((Number) fc.get(COMPETENCE_ID)).longValue() : null;
                if (compId != null && gaps.contains(compId)) match = true;
                if (fc.get(COMPETENCE_NOM) != null) names.add(String.valueOf(fc.get(COMPETENCE_NOM)));
            }
            return match;
        } catch (Exception ex) {
            return false;
        }
    }

    private Map<String, Object> createFallbackRecommendation() {
        Map<String, Object> reco = new LinkedHashMap<>();
        reco.put(FORMATION_ID, "N/A");
        reco.put(TITRE, "Service formation indisponible");
        reco.put("probabiliteReussite", 0.0);
        return reco;
    }

    /**
     * Détecter les besoins prioritaires.
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> detecterBesoins(String enseignantId) {
        List<Map<String, Object>> besoins = new ArrayList<>();
        try {
            String besoinUrl = besoinFormationServiceUrl + "/besoinsFormations/retrieve-approved-BesoinFormations";
            List<Map<String, Object>> besoinsApprouves = restTemplate.getForObject(besoinUrl, List.class);
            if (besoinsApprouves != null) {
                Map<String, Long> countByComp = besoinsApprouves.stream()
                    .filter(b -> b.get(COMPETENCE) != null || b.get(TITRE) != null)
                    .collect(Collectors.groupingBy(
                        b -> String.valueOf(b.getOrDefault(COMPETENCE, b.getOrDefault(TITRE, "inconnu"))),
                        Collectors.counting()
                    ));
                countByComp.forEach((comp, count) -> {
                    Map<String, Object> besoin = new LinkedHashMap<>();
                    besoin.put("type", count > 1 ? "collectif" : "individuel");
                    besoin.put(COMPETENCE_CODE, comp);
                    besoin.put(PRIORITE, getPrioriteValue(count));
                    besoins.add(besoin);
                });
            }
        } catch (Exception e) {
            log.warn("Service besoin-formation indisponible, fallback via gaps");
            identifierGaps(enseignantId).forEach(gap -> {
                Map<String, Object> besoin = new LinkedHashMap<>();
                besoin.put("type", "individuel");
                besoin.put(COMPETENCE_CODE, gap.get(COMPETENCE_CODE));
                besoin.put(PRIORITE, gap.get(GRAVITE));
                besoins.add(besoin);
            });
        }
        besoins.sort((a, b) -> getPrioriteOrder(b.get(PRIORITE)) - getPrioriteOrder(a.get(PRIORITE)));
        return besoins;
    }

    private String getPrioriteValue(long count) {
        if (count >= 5) return PRIORITE_HAUTE;
        if (count >= 2) return MOYENNE;
        return GRAVITE_FAIBLE;
    }

    private String getGraviteValue(double gapVal) {
        if (gapVal >= 3) return GRAVITE_ELEVEE;
        if (gapVal >= 2) return GRAVITE_MOYENNE;
        return GRAVITE_FAIBLE;
    }

    private Map<String, Object> genererDashboardEnseignant(String enseignantId) {
        Map<String, Object> dashboard = new LinkedHashMap<>();
        List<Map<String, Object>> gaps = identifierGaps(enseignantId);
        dashboard.put("nombreGaps", gaps.size());
        dashboard.put("scoreGlobal", gaps.isEmpty() ? 5.0 : Math.max(1, 5.0 - gaps.stream().mapToDouble(g -> ((Number) g.get("gap")).doubleValue()).sum() / gaps.size()));
        dashboard.put("statut", gaps.stream().anyMatch(g -> GRAVITE_ELEVEE.equals(g.get(GRAVITE))) ? "a_risque" : "suivi");
        return dashboard;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> analyserTendancesGlobales() {
        Map<String, Object> result = new LinkedHashMap<>();
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put(TOTAL_EVALUATIONS, 0);
        stats.put(NOTE_MOYENNE, 0.0);
        try {
            String evalUrl = evaluationServiceUrl + EVALUATIONS_GLOBALES;
            List<Map<String, Object>> evals = restTemplate.getForObject(evalUrl, List.class);
            if (evals != null) {
                stats.put(TOTAL_EVALUATIONS, evals.size());
                stats.put(NOTE_MOYENNE, evals.stream().filter(e -> e.get("note") != null).mapToDouble(e -> ((Number) e.get("note")).doubleValue()).average().orElse(0.0));
            }
        } catch (Exception e) {
            log.warn("Service evaluation indisponible pour tendances");
            stats.put(TOTAL_EVALUATIONS, 0);
            stats.put(NOTE_MOYENNE, 0.0);
        }
        result.put("statistiques", stats);
        result.put("dashboard", genererDashboard());
        return result;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> genererDashboard() {
        Map<String, Object> dashboard = new LinkedHashMap<>();
        // Initialize defaults to avoid missing keys
        dashboard.put("competencesEnDeclin", Collections.emptyList());
        dashboard.put("competencesEnForteDemande", Collections.emptyList());
        dashboard.put("enseignantsARisque", Collections.emptyList());
        dashboard.put("tauxCouverture", 0.0);
        
        try {
            String evalUrl = evaluationServiceUrl + EVALUATIONS_GLOBALES;
            List<Map<String, Object>> evals = restTemplate.getForObject(evalUrl, List.class);
            if (evals != null) {
                List<String> aRisque = evals.stream()
                    .filter(e -> e.get("note") != null && ((Number) e.get("note")).doubleValue() < 2)
                    .map(e -> String.valueOf(e.get("evaluateurId"))).distinct().toList();
                dashboard.put("enseignantsARisque", aRisque);
            }
        } catch (Exception e) {
            log.warn("Dashboard metrics partial failure");
        }
        return dashboard;
    }

    private int parseNiveau(Object niveauObj) {
        if (niveauObj == null) return 0;
        if (niveauObj instanceof Number number) return number.intValue();
        String s = String.valueOf(niveauObj).toUpperCase();
        return switch (s) {
            case "DEBUTANT", "1", "NIVEAU_1" -> 1;
            case "INITIE", "2", "NIVEAU_2" -> 2;
            case "CONFIRME", "3", "NIVEAU_3" -> 3;
            case "AVANCE", "4", "NIVEAU_4" -> 4;
            case "EXPERT", "5", "NIVEAU_5" -> 5;
            default -> 0;
        };
    }

    private double calculateProbabilite(boolean cibleUnGap, String etat) {
        if (cibleUnGap) return 0.90;
        if ("EN_COURS".equals(etat)) return 0.70;
        return 0.50;
    }

    private int getPrioriteOrder(Object priorite) {
        if (PRIORITE_HAUTE.equals(priorite) || GRAVITE_ELEVEE.equals(priorite)) return 3;
        if (MOYENNE.equals(priorite) || GRAVITE_MOYENNE.equals(priorite)) return 2;
        return 1;
    }
}