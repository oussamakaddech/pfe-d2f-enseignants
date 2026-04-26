package esprit.pfe.serviceanalyse.Services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AnalysePredictiveService {

    private final RestTemplate restTemplate = new RestTemplate();

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
     * Identifier les gaps de compétences d'un enseignant
     * via l'API enseignant-competences du service compétence.
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> identifierGaps(String enseignantId) {
        List<Map<String, Object>> gaps = new ArrayList<>();
        try {
            // API correcte : /api/v1/enseignant-competences/enseignant/{id}
            String compUrl = competenceServiceUrl + "/api/v1/enseignant-competences/enseignant/" + enseignantId;
            List<Map<String, Object>> affectations = restTemplate.getForObject(compUrl, List.class);
            if (affectations != null) {
                for (Map<String, Object> aff : affectations) {
                    Object niveauObj = aff.get("niveauMaitrise");
                    int niveauActuel = parseNiveau(niveauObj);
                    int niveauCible = 4; // Niveau cible par défaut (confirmé)
                    Object compObj = aff.get("competence");
                    String compNom = "";
                    Long compId = null;
                    if (compObj instanceof Map) {
                        Map<String, Object> compMap = (Map<String, Object>) compObj;
                        compNom = String.valueOf(compMap.getOrDefault("nom", "Inconnu"));
                        compId = compMap.get("id") != null ? ((Number) compMap.get("id")).longValue() : null;
                    } else {
                        compNom = String.valueOf(aff.getOrDefault("competenceNom", "Inconnu"));
                    }

                    // Savoir info
                    String savoirNom = "";
                    String savoirType = "";
                    Object savoirObj = aff.get("savoir");
                    if (savoirObj instanceof Map) {
                        Map<String, Object> savoirMap = (Map<String, Object>) savoirObj;
                        savoirNom = String.valueOf(savoirMap.getOrDefault("nom", ""));
                        savoirType = String.valueOf(savoirMap.getOrDefault("type", ""));
                    }

                    double gapVal = niveauCible - niveauActuel;
                    if (gapVal > 0) {
                        Map<String, Object> gap = new LinkedHashMap<>();
                        gap.put("competenceId", compId);
                        gap.put("competenceCode", aff.getOrDefault("competenceCode", "N/A"));
                        gap.put("competenceLabel", compNom);
                        gap.put("savoirNom", savoirNom);
                        gap.put("savoirType", savoirType);
                        gap.put("niveauActuel", niveauActuel);
                        gap.put("niveauCible", niveauCible);
                        gap.put("gap", gapVal);
                        gap.put("gravite", gapVal >= 3 ? "elevee" : gapVal >= 2 ? "moyenne" : "faible");
                        gap.put("explication", "Écart de " + gapVal + " niveau(x) — actuel: " + niveauActuel + " / cible: " + niveauCible);
                        gaps.add(gap);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Service compétence indisponible pour gaps : {}", e.getMessage());
            // Fallback via les évaluations
            gaps.addAll(identifierGapsViaEvaluations(enseignantId));
        }
        gaps.sort((a, b) -> {
            int orderA = "elevee".equals(a.get("gravite")) ? 3 : "moyenne".equals(a.get("gravite")) ? 2 : 1;
            int orderB = "elevee".equals(b.get("gravite")) ? 3 : "moyenne".equals(b.get("gravite")) ? 2 : 1;
            return orderB - orderA;
        });
        return gaps;
    }

    /**
     * Fallback : identifier gaps via les évaluations si le service compétence est indisponible.
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> identifierGapsViaEvaluations(String enseignantId) {
        List<Map<String, Object>> gaps = new ArrayList<>();
        try {
            String evalUrl = evaluationServiceUrl + "/evaluation/evaluations-globales";
            List<Map<String, Object>> evals = restTemplate.getForObject(evalUrl, List.class);
            if (evals != null) {
                double avgNote = evals.stream()
                    .filter(e -> e.get("note") != null)
                    .mapToDouble(e -> ((Number) e.get("note")).doubleValue())
                    .average().orElse(3.0);
                double gapVal = Math.max(0, 3.0 - avgNote);
                if (gapVal > 0) {
                    Map<String, Object> gap = new LinkedHashMap<>();
                    gap.put("competenceCode", "EVAL-001");
                    gap.put("competenceLabel", "Compétence globale (basée évaluations)");
                    gap.put("niveauActuel", avgNote);
                    gap.put("niveauCible", 3.0);
                    gap.put("gap", gapVal);
                    gap.put("gravite", gapVal >= 2 ? "elevee" : "moyenne");
                    gap.put("explication", "Note moyenne des évaluations: " + String.format("%.1f", avgNote) + " / cible: 3.0");
                    gaps.add(gap);
                }
            }
        } catch (Exception ex) {
            log.warn("Service evaluation aussi indisponible : {}", ex.getMessage());
        }
        return gaps;
    }

    /**
     * Recommander des formations adaptées aux gaps identifiés.
     * Utilise les liaisons formation-competences du service formation.
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> recommanderFormations(String enseignantId, Long competenceCible) {
        List<Map<String, Object>> recommandations = new ArrayList<>();
        try {
            // Récupérer les gaps de l'enseignant
            List<Map<String, Object>> gaps = identifierGaps(enseignantId);
            Set<Long> competenceIdsAvecGap = new HashSet<>();
            if (competenceCible != null) {
                competenceIdsAvecGap.add(competenceCible);
            } else {
                competenceIdsAvecGap = gaps.stream()
                    .filter(g -> g.get("competenceId") != null)
                    .map(g -> ((Number) g.get("competenceId")).longValue())
                    .collect(Collectors.toSet());
            }

            // Récupérer toutes les formations
            String formUrl = formationServiceUrl + "/formations";
            List<Map<String, Object>> formations = restTemplate.getForObject(formUrl, List.class);
            if (formations != null) {
                int ordre = 1;
                for (Map<String, Object> formation : formations) {
                    String etat = (String) formation.getOrDefault("etatFormation", "");
                    if ("ANNULEE".equals(etat)) continue;

                    Long formationId = formation.get("idFormation") != null ?
                        ((Number) formation.get("idFormation")).longValue() : null;

                    // Vérifier si cette formation cible des compétences avec gap
                    boolean cibleUnGap = false;
                    List<String> competencesCiblees = new ArrayList<>();
                    if (formationId != null) {
                        try {
                            String fcUrl = formationServiceUrl + "/formation-competences/formation/" + formationId;
                            List<Map<String, Object>> fcLinks = restTemplate.getForObject(fcUrl, List.class);
                            if (fcLinks != null) {
                                for (Map<String, Object> fc : fcLinks) {
                                    Long compId = fc.get("competenceId") != null ?
                                        ((Number) fc.get("competenceId")).longValue() : null;
                                    if (compId != null && competenceIdsAvecGap.contains(compId)) {
                                        cibleUnGap = true;
                                    }
                                    if (fc.get("competenceNom") != null) {
                                        competencesCiblees.add(String.valueOf(fc.get("competenceNom")));
                                    }
                                }
                            }
                        } catch (Exception ex) {
                            log.debug("Pas de liaisons formation-competence pour formation {}", formationId);
                        }
                    }

                    Map<String, Object> reco = new LinkedHashMap<>();
                    reco.put("formationId", String.valueOf(formationId));
                    reco.put("titre", formation.getOrDefault("titreFormation", "Sans titre"));
                    reco.put("ordre", ordre++);
                    reco.put("dureeEstimee", formation.getOrDefault("chargeHoraireGlobal", 0) + "h");
                    reco.put("competencesCiblees", competencesCiblees);
                    reco.put("prerequisManquants", new ArrayList<String>());
                    double proba = cibleUnGap ? 0.90 : "EN_COURS".equals(etat) ? 0.70 : "PLANIFIEE".equals(etat) ? 0.60 : 0.40;
                    reco.put("probabiliteReussite", proba);
                    reco.put("justification", cibleUnGap ?
                        "Formation ciblant des compétences en gap pour cet enseignant" :
                        "Formation " + etat + " dans le domaine " + formation.getOrDefault("domaine", "général"));
                    reco.put("priorite", cibleUnGap ? "haute" : "moyenne");
                    recommandations.add(reco);
                }
            }
            // Trier : priorité haute en premier
            recommandations.sort((a, b) -> "haute".equals(a.get("priorite")) ? -1 : 1);
        } catch (Exception e) {
            log.warn("Service formation indisponible : {}", e.getMessage());
            Map<String, Object> reco = new LinkedHashMap<>();
            reco.put("formationId", "N/A");
            reco.put("titre", "Service formation indisponible");
            reco.put("ordre", 1);
            reco.put("dureeEstimee", "N/A");
            reco.put("prerequisManquants", new ArrayList<String>());
            reco.put("probabiliteReussite", 0.0);
            reco.put("justification", "Impossible de récupérer les formations.");
            recommandations.add(reco);
        }
        return recommandations;
    }

    /**
     * Détecter les besoins prioritaires (individuels et collectifs).
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> detecterBesoins(String enseignantId) {
        List<Map<String, Object>> besoins = new ArrayList<>();
        try {
            String besoinUrl = besoinFormationServiceUrl + "/besoinsFormations/retrieve-approved-BesoinFormations";
            List<Map<String, Object>> besoinsApprouves = restTemplate.getForObject(besoinUrl, List.class);
            if (besoinsApprouves != null) {
                Map<String, Long> countByCompetence = besoinsApprouves.stream()
                    .filter(b -> b.get("competence") != null || b.get("titre") != null)
                    .collect(Collectors.groupingBy(
                        b -> String.valueOf(b.getOrDefault("competence", b.getOrDefault("titre", "inconnu"))),
                        Collectors.counting()
                    ));
                for (Map.Entry<String, Long> entry : countByCompetence.entrySet()) {
                    Map<String, Object> besoin = new LinkedHashMap<>();
                    besoin.put("type", entry.getValue() > 1 ? "collectif" : "individuel");
                    besoin.put("competenceCode", entry.getKey());
                    besoin.put("priorite", entry.getValue() >= 5 ? "haute" : entry.getValue() >= 2 ? "moyenne" : "faible");
                    besoin.put("raison", entry.getValue() + " besoin(s) identifié(s) pour cette compétence");
                    besoins.add(besoin);
                }
            }
        } catch (Exception e) {
            log.warn("Service besoin-formation indisponible : {}", e.getMessage());
            // Fallback via les gaps
            List<Map<String, Object>> gaps = identifierGaps(enseignantId);
            for (Map<String, Object> gap : gaps) {
                Map<String, Object> besoin = new LinkedHashMap<>();
                besoin.put("type", "individuel");
                besoin.put("competenceCode", gap.get("competenceCode"));
                besoin.put("priorite", gap.get("gravite"));
                besoin.put("raison", "Gap détecté : " + gap.get("explication"));
                besoins.add(besoin);
            }
        }
        besoins.sort((a, b) -> {
            int orderA = "haute".equals(a.get("priorite")) ? 3 : "moyenne".equals(a.get("priorite")) ? 2 : 1;
            int orderB = "haute".equals(b.get("priorite")) ? 3 : "moyenne".equals(b.get("priorite")) ? 2 : 1;
            return orderB - orderA;
        });
        return besoins;
    }

    /**
     * Dashboard prédictif pour un enseignant spécifique.
     */
    private Map<String, Object> genererDashboardEnseignant(String enseignantId) {
        Map<String, Object> dashboard = new LinkedHashMap<>();
        List<Map<String, Object>> gaps = identifierGaps(enseignantId);
        dashboard.put("nombreGaps", gaps.size());
        dashboard.put("gapsEleves", gaps.stream().filter(g -> "elevee".equals(g.get("gravite"))).count());
        dashboard.put("gapsMoyens", gaps.stream().filter(g -> "moyenne".equals(g.get("gravite"))).count());
        dashboard.put("scoreGlobal", gaps.isEmpty() ? 5.0 : Math.max(1, 5.0 - gaps.stream().mapToDouble(g -> ((Number) g.get("gap")).doubleValue()).sum() / gaps.size()));
        dashboard.put("statut", gaps.stream().anyMatch(g -> "elevee".equals(g.get("gravite"))) ? "a_risque" : "suivi");
        return dashboard;
    }

    /**
     * Générer des indicateurs pour le tableau de bord prédictif global.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> genererDashboard() {
        Map<String, Object> dashboard = new LinkedHashMap<>();
        try {
            String evalUrl = evaluationServiceUrl + "/evaluation/evaluations-globales";
            List<Map<String, Object>> evals = restTemplate.getForObject(evalUrl, List.class);
            if (evals != null) {
                // Compétences en déclin : formations avec notes basses
                List<String> enDeclin = evals.stream()
                    .filter(e -> e.get("note") != null && ((Number) e.get("note")).doubleValue() < 3)
                    .map(e -> "Formation-" + e.get("formationId"))
                    .distinct()
                    .collect(Collectors.toList());
                dashboard.put("competencesEnDeclin", enDeclin);

                // Compétences en forte demande
                Map<String, Long> formationCount = evals.stream()
                    .filter(e -> e.get("formationId") != null)
                    .collect(Collectors.groupingBy(e -> String.valueOf(e.get("formationId")), Collectors.counting()));
                List<String> enForteDemande = formationCount.entrySet().stream()
                    .filter(e -> e.getValue() >= 3)
                    .map(e -> "Formation-" + e.getKey())
                    .collect(Collectors.toList());
                dashboard.put("competencesEnForteDemande", enForteDemande);

                // Enseignants à risque
                List<String> aRisque = evals.stream()
                    .filter(e -> e.get("note") != null && ((Number) e.get("note")).doubleValue() < 2)
                    .map(e -> e.get("evaluateurId") != null ? String.valueOf(e.get("evaluateurId")) : null)
                    .filter(Objects::nonNull)
                    .distinct()
                    .collect(Collectors.toList());
                dashboard.put("enseignantsARisque", aRisque);
            }
        } catch (Exception e) {
            log.warn("Service evaluation indisponible pour le dashboard : {}", e.getMessage());
        }

        // Enrichir avec les données de compétences
        try {
            String compUrl = competenceServiceUrl + "/api/v1/enseignant-competences";
            Map<String, Object> compPage = restTemplate.getForObject(compUrl, Map.class);
            if (compPage != null) {
                List<Map<String, Object>> content = (List<Map<String, Object>>) compPage.get("content");
                if (content != null) {
                    // Compétences par niveau
                    Map<String, Long> byNiveau = content.stream()
                        .filter(c -> c.get("niveauMaitrise") != null)
                        .collect(Collectors.groupingBy(c -> String.valueOf(c.get("niveauMaitrise")), Collectors.counting()));
                    dashboard.put("repartitionNiveaux", byNiveau);

                    // Enseignants avec niveau faible (1-2)
                    List<String> enseignantsFaible = content.stream()
                        .filter(c -> c.get("niveauMaitrise") != null)
                        .filter(c -> {
                            int n = parseNiveau(c.get("niveauMaitrise"));
                            return n > 0 && n <= 2;
                        })
                        .map(c -> String.valueOf(c.getOrDefault("enseignantId", "inconnu")))
                        .distinct()
                        .collect(Collectors.toList());
                    dashboard.put("enseignantsNiveauFaible", enseignantsFaible);

                    // Taux de couverture
                    long total = content.size();
                    long niveauOk = content.stream()
                        .filter(c -> parseNiveau(c.get("niveauMaitrise")) >= 3)
                        .count();
                    dashboard.put("tauxCouverture", total > 0 ? (double) niveauOk / total * 100 : 0);
                }
            }
        } catch (Exception e) {
            log.warn("Service compétence indisponible pour le dashboard : {}", e.getMessage());
        }

        // Valeurs par défaut si vide
        dashboard.putIfAbsent("competencesEnDeclin", Collections.emptyList());
        dashboard.putIfAbsent("competencesEnForteDemande", Collections.emptyList());
        dashboard.putIfAbsent("enseignantsARisque", Collections.emptyList());
        dashboard.putIfAbsent("repartitionNiveaux", Collections.emptyMap());
        dashboard.putIfAbsent("enseignantsNiveauFaible", Collections.emptyList());
        dashboard.putIfAbsent("tauxCouverture", 0.0);

        return dashboard;
    }

    /**
     * Analyser les tendances globales (tous enseignants).
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> analyserTendancesGlobales() {
        Map<String, Object> result = new LinkedHashMap<>();
        Map<String, Object> stats = new LinkedHashMap<>();

        try {
            String evalUrl = evaluationServiceUrl + "/evaluation/evaluations-globales";
            List<Map<String, Object>> evals = restTemplate.getForObject(evalUrl, List.class);
            if (evals != null) {
                stats.put("totalEvaluations", evals.size());
                stats.put("noteMoyenne", evals.stream()
                    .filter(e -> e.get("note") != null)
                    .mapToDouble(e -> ((Number) e.get("note")).doubleValue())
                    .average().orElse(0.0));
                stats.put("formationsEvaluees", evals.stream()
                    .map(e -> e.get("formationId"))
                    .filter(Objects::nonNull)
                    .distinct().count());
            }
        } catch (Exception e) {
            log.warn("Service evaluation indisponible pour tendances : {}", e.getMessage());
            stats.put("totalEvaluations", 0);
            stats.put("noteMoyenne", 0.0);
            stats.put("formationsEvaluees", 0);
        }

        result.put("statistiques", stats);
        result.put("dashboard", genererDashboard());
        return result;
    }

    /**
     * Parser le niveau de maîtrise (enum ou entier) vers un entier 1-5.
     */
    private int parseNiveau(Object niveauObj) {
        if (niveauObj == null) return 0;
        if (niveauObj instanceof Number) return ((Number) niveauObj).intValue();
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
}