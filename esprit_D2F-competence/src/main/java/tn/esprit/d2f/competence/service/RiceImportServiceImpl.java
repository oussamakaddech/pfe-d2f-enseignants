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
import java.util.stream.Collectors;

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

    @Override
    @Transactional
    public RiceImportResult importRice(RiceImportRequest request) {
        int domainesCreated      = 0;
        int competencesCreated   = 0;
        int sousCompetencesCreated = 0;
        int savoirsCreated       = 0;
        int affectationsCreated  = 0;
        Set<String> enseignantsCoveredSet = new LinkedHashSet<>();

        // domain â†’ [savoirIds with â‰¥1 teacher, total savoir count]
        Map<String, int[]> domainSavoirStats = new LinkedHashMap<>();

        for (RiceDomaineRequest domReq : request.getDomaines()) {
            // â”€â”€ Domaine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            boolean[] isNewDomaine = {false};
            Domaine domaine = domaineRepository.findByCode(domReq.getCode())
                    .orElseGet(() -> {
                        isNewDomaine[0] = true;
                        return domaineRepository.save(Domaine.builder()
                                .code(domReq.getCode())
                                .nom(domReq.getNom())
                                .description(domReq.getDescription())
                                .actif(true)
                                .build());
                    });
            if (isNewDomaine[0]) domainesCreated++;

            // [0] = savoirs with â‰¥1 teacher, [1] = total savoirs
            int[] savoirStats = {0, 0};
            domainSavoirStats.put(domReq.getNom(), savoirStats);

            if (domReq.getCompetences() == null) continue;

            for (RiceCompetenceRequest compReq : domReq.getCompetences()) {
                // â”€â”€ CompÃ©tence â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                boolean[] isNewComp = {false};
                final Domaine finalDomaine = domaine;
                Competence competence = competenceRepository.findByCode(compReq.getCode())
                        .orElseGet(() -> {
                            isNewComp[0] = true;
                            return competenceRepository.save(Competence.builder()
                                    .code(compReq.getCode())
                                    .nom(compReq.getNom())
                                    .description(compReq.getDescription())
                                    .ordre(compReq.getOrdre() != null ? compReq.getOrdre() : 1)
                                    .domaine(finalDomaine)
                                    .build());
                        });
                if (isNewComp[0]) competencesCreated++;

                if (compReq.getSavoirs() != null) {
                    for (RiceSavoirRequest savReq : compReq.getSavoirs()) {
                        boolean[] isNewSav = {false};
                        final Competence finalCompForSav = competence;
                        Savoir savoir = savoirRepository.findByCode(savReq.getCode())
                                .orElseGet(() -> {
                                    isNewSav[0] = true;
                                    return savoirRepository.save(Savoir.builder()
                                            .code(savReq.getCode())
                                            .nom(savReq.getNom())
                                            .description(savReq.getDescription())
                                            .type(parseTypeSavoir(savReq.getType()))
                                            .niveau(parseNiveau(savReq.getNiveau()))
                                            .competence(finalCompForSav)
                                            .sousCompetence(null)
                                            .build());
                                });
                        if (isNewSav[0]) savoirsCreated++;

                        savoirStats[1]++;

                        List<String> ensIds = savReq.getEnseignantIds();
                        if (ensIds != null && !ensIds.isEmpty()) {
                            final Savoir finalSavoir = savoir;
                            final NiveauMaitrise niveau = parseNiveau(savReq.getNiveau());
                            int linksCreated = 0;
                            for (String ensId : ensIds) {
                                if (ensId == null || ensId.isBlank()
                                        || ensId.startsWith("ext_")
                                        || ensId.startsWith("manual_")) {
                                    continue;
                                }
                                try {
                                    if (!enseignantCompetenceRepository
                                            .existsByEnseignantIdAndSavoirId(ensId, finalSavoir.getId())) {
                                        enseignantCompetenceRepository.save(
                                                EnseignantCompetence.builder()
                                                        .enseignantId(ensId)
                                                        .savoir(finalSavoir)
                                                        .niveau(niveau)
                                                        .dateAcquisition(LocalDate.now())
                                                        .build());
                                        linksCreated++;
                                        affectationsCreated++;
                                    }
                                    enseignantsCoveredSet.add(ensId);
                                } catch (Exception e) {
                                    log.warn("Link {}->{} skipped: {}", ensId, savReq.getCode(), e.getMessage());
                                }
                            }
                            if (linksCreated > 0) savoirStats[0]++;
                        }
                    }
                }

                if (compReq.getSousCompetences() == null) continue;

                for (RiceSousCompetenceRequest scReq : compReq.getSousCompetences()) {
                    // â”€â”€ Sous-compÃ©tence â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                    boolean[] isNewSc = {false};
                    final Competence finalComp = competence;
                    SousCompetence sc = sousCompetenceRepository.findByCode(scReq.getCode())
                            .orElseGet(() -> {
                                isNewSc[0] = true;
                                return sousCompetenceRepository.save(SousCompetence.builder()
                                        .code(scReq.getCode())
                                        .nom(scReq.getNom())
                                        .description(scReq.getDescription())
                                        .competence(finalComp)
                                        .build());
                            });
                    if (isNewSc[0]) sousCompetencesCreated++;

                    if (scReq.getSavoirs() == null) continue;

                    for (RiceSavoirRequest savReq : scReq.getSavoirs()) {
                        // â”€â”€ Savoir â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                        boolean[] isNewSav = {false};
                        final SousCompetence finalSc = sc;
                        Savoir savoir = savoirRepository.findByCode(savReq.getCode())
                                .orElseGet(() -> {
                                    isNewSav[0] = true;
                                    return savoirRepository.save(Savoir.builder()
                                            .code(savReq.getCode())
                                            .nom(savReq.getNom())
                                            .description(savReq.getDescription())
                                            .type(parseTypeSavoir(savReq.getType()))
                                            .niveau(parseNiveau(savReq.getNiveau()))
                                            .sousCompetence(finalSc)
                                            .build());
                                });
                        if (isNewSav[0]) savoirsCreated++;

                        savoirStats[1]++;  // total savoirs in this domain

                        // â”€â”€ Enseignant assignments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                        List<String> ensIds = savReq.getEnseignantIds();
                        if (ensIds != null && !ensIds.isEmpty()) {
                            final Savoir finalSavoir = savoir;
                            final NiveauMaitrise niveau = parseNiveau(savReq.getNiveau());
                            int linksCreated = 0;
                            for (String ensId : ensIds) {
                                if (ensId == null || ensId.isBlank()
                                        || ensId.startsWith("ext_")
                                        || ensId.startsWith("manual_")) {
                                    continue;  // skip synthetic IDs
                                }
                                try {
                                    if (!enseignantCompetenceRepository
                                            .existsByEnseignantIdAndSavoirId(ensId, finalSavoir.getId())) {
                                        enseignantCompetenceRepository.save(
                                                EnseignantCompetence.builder()
                                                        .enseignantId(ensId)
                                                        .savoir(finalSavoir)
                                                        .niveau(niveau)
                                                        .dateAcquisition(LocalDate.now())
                                                        .build());
                                        linksCreated++;
                                        affectationsCreated++;
                                    }
                                    enseignantsCoveredSet.add(ensId);
                                } catch (Exception e) {
                                    log.warn("Link {}->{} skipped: {}", ensId, savReq.getCode(), e.getMessage());
                                }
                            }
                            if (linksCreated > 0) savoirStats[0]++;  // savoir has â‰¥1 teacher
                        }
                    }
                }
            }
        }

        // â”€â”€ Taux de couverture par domaine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        Map<String, Double> tauxParDomaine = new LinkedHashMap<>();
        domainSavoirStats.forEach((nomDomaine, stats) -> {
            int covered = stats[0];
            int total   = stats[1];
            double taux = (total > 0) ? Math.round((covered * 100.0 / total) * 10.0) / 10.0 : 0.0;
            tauxParDomaine.put(nomDomaine, taux);
        });

        int enseignantsCovered = enseignantsCoveredSet.size();

        log.info("RICE import: {} domaines, {} compÃ©tences, {} sous-comps, {} savoirs crÃ©Ã©s, "
                + "{} affectations, {} enseignants couverts",
                domainesCreated, competencesCreated, sousCompetencesCreated, savoirsCreated,
                affectationsCreated, enseignantsCovered);

        String message = String.format(
                "Import RICE rÃ©ussi : %d domaines, %d compÃ©tences, %d sous-compÃ©tences, %d savoirs crÃ©Ã©s,"
                + " %d affectation(s), %d enseignant(s) couvert(s).",
                domainesCreated, competencesCreated, sousCompetencesCreated, savoirsCreated,
                affectationsCreated, enseignantsCovered);

        // â”€â”€ Persist import log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        RiceImportLog log_ = RiceImportLog.builder()
                .generatedAt(LocalDateTime.now())
                .domainesCreated(domainesCreated)
                .competencesCreated(competencesCreated)
                .sousCompetencesCreated(sousCompetencesCreated)
                .savoirsCreated(savoirsCreated)
                .affectationsCreated(affectationsCreated)
                .enseignantsCovered(enseignantsCovered)
                .message(message)
                .tauxJson(serializeTaux(tauxParDomaine))
                .build();
        riceImportLogRepository.save(log_);

        return RiceImportResult.builder()
                .generatedAt(log_.getGeneratedAt())
                .domainesCreated(domainesCreated)
                .competencesCreated(competencesCreated)
                .sousCompetencesCreated(sousCompetencesCreated)
                .savoirsCreated(savoirsCreated)
                .affectationsCreated(affectationsCreated)
                .enseignantsCovered(enseignantsCovered)
                .tauxCouvertureParDomaine(tauxParDomaine)
                .message(message)
                .build();
    }

    // â”€â”€ helpers & history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Override
    @Transactional(readOnly = true)
    public List<RiceImportResult> getImportHistory() {
        return riceImportLogRepository.findAllByOrderByGeneratedAtDesc().stream()
                .map(this::toResult)
                .collect(Collectors.toList());
    }

    private RiceImportResult toResult(RiceImportLog log) {
        return RiceImportResult.builder()
                .generatedAt(log.getGeneratedAt())
                .domainesCreated(log.getDomainesCreated())
                .competencesCreated(log.getCompetencesCreated())
                .sousCompetencesCreated(log.getSousCompetencesCreated())
                .savoirsCreated(log.getSavoirsCreated())
                .affectationsCreated(log.getAffectationsCreated())
                .enseignantsCovered(log.getEnseignantsCovered())
                .message(log.getMessage())
                .tauxCouvertureParDomaine(deserializeTaux(log.getTauxJson()))
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
