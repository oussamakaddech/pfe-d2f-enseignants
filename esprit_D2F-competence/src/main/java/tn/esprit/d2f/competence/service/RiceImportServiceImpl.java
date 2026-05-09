package tn.esprit.d2f.competence.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.d2f.competence.dto.*;
import tn.esprit.d2f.competence.entity.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;
import tn.esprit.d2f.competence.repository.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;


@Slf4j
@Service
@RequiredArgsConstructor
public class RiceImportServiceImpl implements IRiceImportService {

    private final DomaineRepository                domaineRepository;
    private final CompetenceRepository             competenceRepository;
    private final SousCompetenceRepository         sousCompetenceRepository;
    private final SavoirRepository                 savoirRepository;
    private final EnseignantCompetenceRepository   enseignantCompetenceRepository;
    private final RiceImportLogRepository          riceImportLogRepository;
    private final ObjectMapper                     objectMapper;

    /** Mutable counters passed through the import pipeline. */
    private static class ImportCounters {
        int domainesCreated;
        int competencesCreated;
        int sousCompetencesCreated;
        int savoirsCreated;
        int affectationsCreated;
        final Set<String> enseignantsCoveredSet = new LinkedHashSet<>();
        final Map<String, int[]> domainSavoirStats = new LinkedHashMap<>();
    }

    @Override
    @Transactional
    public RiceImportResult importRice(RiceImportRequest request) {
        ImportCounters counters = new ImportCounters();

        for (RiceDomaineRequest domReq : request.getDomaines()) {
            processDomaine(domReq, counters);
        }

        return buildResult(counters);
    }

    // ── Domaine level ────────────────────────────────────────────────────────

    private void processDomaine(RiceDomaineRequest domReq, ImportCounters c) {
        boolean[] isNew = {false};
        Domaine domaine = domaineRepository.findByCode(domReq.getCode())
                .orElseGet(() -> {
                    isNew[0] = true;
                    return domaineRepository.save(Domaine.builder()
                            .code(domReq.getCode())
                            .nom(domReq.getNom())
                            .description(domReq.getDescription())
                            .actif(true)
                            .build());
                });
        if (isNew[0]) c.domainesCreated++;

        int[] savoirStats = {0, 0};
        c.domainSavoirStats.put(domReq.getNom(), savoirStats);

        if (domReq.getCompetences() == null) return;

        for (RiceCompetenceRequest compReq : domReq.getCompetences()) {
            processCompetence(compReq, domaine, savoirStats, c);
        }
    }

    // ── Competence level ─────────────────────────────────────────────────────

    private void processCompetence(RiceCompetenceRequest compReq, Domaine domaine,
                                   int[] savoirStats, ImportCounters c) {
        boolean[] isNew = {false};
        final Domaine finalDomaine = domaine;
        Competence competence = competenceRepository.findByCode(compReq.getCode())
                .orElseGet(() -> {
                    isNew[0] = true;
                    return competenceRepository.save(Competence.builder()
                            .code(compReq.getCode())
                            .nom(compReq.getNom())
                            .description(compReq.getDescription())
                            .ordre(compReq.getOrdre() != null ? compReq.getOrdre() : 1)
                            .domaine(finalDomaine)
                            .build());
                });
        if (isNew[0]) c.competencesCreated++;

        // Direct savoirs on competence
        if (compReq.getSavoirs() != null) {
            for (RiceSavoirRequest savReq : compReq.getSavoirs()) {
                processSavoirOnCompetence(savReq, competence, savoirStats, c);
            }
        }

        // Sous-competences
        if (compReq.getSousCompetences() != null) {
            for (RiceSousCompetenceRequest scReq : compReq.getSousCompetences()) {
                processSousCompetence(scReq, competence, savoirStats, c);
            }
        }
    }

    // ── Sous-Competence level ────────────────────────────────────────────────

    private void processSousCompetence(RiceSousCompetenceRequest scReq, Competence competence,
                                       int[] savoirStats, ImportCounters c) {
        boolean[] isNew = {false};
        final Competence finalComp = competence;
        SousCompetence sc = sousCompetenceRepository.findByCode(scReq.getCode())
                .orElseGet(() -> {
                    isNew[0] = true;
                    return sousCompetenceRepository.save(SousCompetence.builder()
                            .code(scReq.getCode())
                            .nom(scReq.getNom())
                            .description(scReq.getDescription())
                            .competence(finalComp)
                            .build());
                });
        if (isNew[0]) c.sousCompetencesCreated++;

        if (scReq.getSavoirs() == null) return;

        for (RiceSavoirRequest savReq : scReq.getSavoirs()) {
            processSavoirOnSousCompetence(savReq, sc, savoirStats, c);
        }
    }

    // ── Savoir level ─────────────────────────────────────────────────────────

    private void processSavoirOnCompetence(RiceSavoirRequest savReq, Competence competence,
                                           int[] savoirStats, ImportCounters c) {
        boolean[] isNew = {false};
        final Competence finalComp = competence;
        Savoir savoir = savoirRepository.findByCode(savReq.getCode())
                .orElseGet(() -> {
                    isNew[0] = true;
                    return savoirRepository.save(Savoir.builder()
                            .code(savReq.getCode())
                            .nom(savReq.getNom())
                            .description(savReq.getDescription())
                            .type(parseTypeSavoir(savReq.getType()))
                            .niveau(parseNiveau(savReq.getNiveau()))
                            .competence(finalComp)
                            .sousCompetence(null)
                            .build());
                });
        if (isNew[0]) c.savoirsCreated++;
        savoirStats[1]++;
        processEnseignantAssignments(savReq, savoir, savoirStats, c);
    }

    private void processSavoirOnSousCompetence(RiceSavoirRequest savReq, SousCompetence sc,
                                                int[] savoirStats, ImportCounters c) {
        boolean[] isNew = {false};
        final SousCompetence finalSc = sc;
        Savoir savoir = savoirRepository.findByCode(savReq.getCode())
                .orElseGet(() -> {
                    isNew[0] = true;
                    return savoirRepository.save(Savoir.builder()
                            .code(savReq.getCode())
                            .nom(savReq.getNom())
                            .description(savReq.getDescription())
                            .type(parseTypeSavoir(savReq.getType()))
                            .niveau(parseNiveau(savReq.getNiveau()))
                            .sousCompetence(finalSc)
                            .build());
                });
        if (isNew[0]) c.savoirsCreated++;
        savoirStats[1]++;
        processEnseignantAssignments(savReq, savoir, savoirStats, c);
    }

    // ── Enseignant assignments ────────────────────────────────────────────────

    private void processEnseignantAssignments(RiceSavoirRequest savReq, Savoir savoir,
                                              int[] savoirStats, ImportCounters c) {
        List<String> ensIds = savReq.getEnseignantIds();
        if (ensIds == null || ensIds.isEmpty()) return;

        NiveauMaitrise niveau = parseNiveau(savReq.getNiveau());
        int linksCreated = 0;
        for (String ensId : ensIds) {
            if (isSyntheticId(ensId)) continue;
            linksCreated += tryCreateLink(ensId, savoir, niveau, c);
        }
        if (linksCreated > 0) savoirStats[0]++;
    }

    private boolean isSyntheticId(String ensId) {
        return ensId == null || ensId.isBlank()
                || ensId.startsWith("ext_")
                || ensId.startsWith("manual_");
    }

    private int tryCreateLink(String ensId, Savoir savoir, NiveauMaitrise niveau, ImportCounters c) {
        try {
            if (!enseignantCompetenceRepository.existsByEnseignantIdAndSavoirId(ensId, savoir.getId())) {
                enseignantCompetenceRepository.save(
                        EnseignantCompetence.builder()
                                .enseignantId(ensId)
                                .savoir(savoir)
                                .niveau(niveau)
                                .dateAcquisition(LocalDate.now())
                                .build());
                c.affectationsCreated++;
                c.enseignantsCoveredSet.add(ensId);
                return 1;
            }
            c.enseignantsCoveredSet.add(ensId);
        } catch (Exception e) {
            log.warn("Link {}->{} skipped: {}", ensId, savoir.getCode(), e.getMessage());
        }
        return 0;
    }

    // ── Result building ──────────────────────────────────────────────────────

    private RiceImportResult buildResult(ImportCounters c) {
        Map<String, Double> tauxParDomaine = new LinkedHashMap<>();
        c.domainSavoirStats.forEach((nomDomaine, stats) -> {
            int covered = stats[0];
            int total   = stats[1];
            double taux = (total > 0) ? Math.round((covered * 100.0 / total) * 10.0) / 10.0 : 0.0;
            tauxParDomaine.put(nomDomaine, taux);
        });

        int enseignantsCovered = c.enseignantsCoveredSet.size();

        log.info("RICE import: {} domaines, {} compétences, {} sous-comps, {} savoirs créés, "
                + "{} affectations, {} enseignants couverts",
                c.domainesCreated, c.competencesCreated, c.sousCompetencesCreated, c.savoirsCreated,
                c.affectationsCreated, enseignantsCovered);

        String message = String.format(
                "Import RICE réussi : %d domaines, %d compétences, %d sous-compétences, %d savoirs créés,"
                + " %d affectation(s), %d enseignant(s) couvert(s).",
                c.domainesCreated, c.competencesCreated, c.sousCompetencesCreated, c.savoirsCreated,
                c.affectationsCreated, enseignantsCovered);

        RiceImportLog importLog = RiceImportLog.builder()
                .generatedAt(LocalDateTime.now())
                .domainesCreated(c.domainesCreated)
                .competencesCreated(c.competencesCreated)
                .sousCompetencesCreated(c.sousCompetencesCreated)
                .savoirsCreated(c.savoirsCreated)
                .affectationsCreated(c.affectationsCreated)
                .enseignantsCovered(enseignantsCovered)
                .message(message)
                .tauxJson(serializeTaux(tauxParDomaine))
                .build();
        riceImportLogRepository.save(importLog);

        return RiceImportResult.builder()
                .generatedAt(importLog.getGeneratedAt())
                .domainesCreated(c.domainesCreated)
                .competencesCreated(c.competencesCreated)
                .sousCompetencesCreated(c.sousCompetencesCreated)
                .savoirsCreated(c.savoirsCreated)
                .affectationsCreated(c.affectationsCreated)
                .enseignantsCovered(enseignantsCovered)
                .tauxCouvertureParDomaine(tauxParDomaine)
                .message(message)
                .build();
    }

    // ── helpers & history ─────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<RiceImportResult> getImportHistory() {
        return riceImportLogRepository.findAllByOrderByGeneratedAtDesc().stream()
                .map(this::toResult)
                .toList();
    }

    private RiceImportResult toResult(RiceImportLog logEntry) {
        return RiceImportResult.builder()
                .generatedAt(logEntry.getGeneratedAt())
                .domainesCreated(logEntry.getDomainesCreated())
                .competencesCreated(logEntry.getCompetencesCreated())
                .sousCompetencesCreated(logEntry.getSousCompetencesCreated())
                .savoirsCreated(logEntry.getSavoirsCreated())
                .affectationsCreated(logEntry.getAffectationsCreated())
                .enseignantsCovered(logEntry.getEnseignantsCovered())
                .message(logEntry.getMessage())
                .tauxCouvertureParDomaine(deserializeTaux(logEntry.getTauxJson()))
                .build();
    }

    private String serializeTaux(Map<String, Double> taux) {
        try { return objectMapper.writeValueAsString(taux); } catch (Exception e) { return "{}"; }
    }

    private Map<String, Double> deserializeTaux(String json) {
        if (json == null || json.isBlank()) return Collections.emptyMap();
        try { return objectMapper.readValue(json, new TypeReference<Map<String, Double>>() {}); }
        catch (Exception e) { return Collections.emptyMap(); }
    }

    private TypeSavoir parseTypeSavoir(String type) {
        try { return TypeSavoir.valueOf(type.toUpperCase()); } catch (Exception e) { return TypeSavoir.THEORIQUE; }
    }

    private NiveauMaitrise parseNiveau(String niveau) {
        try { return NiveauMaitrise.valueOf(niveau.toUpperCase()); } catch (Exception e) { return NiveauMaitrise.N2_ELEMENTAIRE; }
    }
}
