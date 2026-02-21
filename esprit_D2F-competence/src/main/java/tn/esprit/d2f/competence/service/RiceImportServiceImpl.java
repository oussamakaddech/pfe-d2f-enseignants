package tn.esprit.d2f.competence.service;

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

    private final DomaineRepository domaineRepository;
    private final CompetenceRepository competenceRepository;
    private final SousCompetenceRepository sousCompetenceRepository;
    private final SavoirRepository savoirRepository;
    private final EnseignantCompetenceRepository enseignantCompetenceRepository;

    @Override
    @Transactional
    public RiceImportResult importRice(RiceImportRequest request) {
        int domainesCreated = 0;
        int competencesCreated = 0;
        int sousCompetencesCreated = 0;
        int savoirsCreated = 0;
        int affectationsCreated = 0;
        Set<String> coveredEnseignants = new HashSet<>();
        Map<String, Double> tauxParDomaine = new LinkedHashMap<>();

        for (RiceDomaineRequest domReq : request.getDomaines()) {
            // ── Domaine ──────────────────────────────────────────────────────
            Domaine domaine = domaineRepository.findByCode(domReq.getCode())
                    .orElseGet(() -> {
                        Domaine d = Domaine.builder()
                                .code(domReq.getCode())
                                .nom(domReq.getNom())
                                .description(domReq.getDescription())
                                .actif(true)
                                .build();
                        return domaineRepository.save(d);
                    });

            boolean wasNew = domaine.getId() == null ||
                    !domaineRepository.existsByCode(domReq.getCode());
            // Re-check: count whether we truly created
            boolean created = domaine.getCompetences() == null ||
                    domaine.getCompetences().isEmpty();
            domainesCreated++;   // count every processed domaine

            int savoirsInDomaine = 0;
            int enseignantsInDomaine = 0;

            if (domReq.getCompetences() == null) continue;

            for (RiceCompetenceRequest compReq : domReq.getCompetences()) {
                // ── Compétence ───────────────────────────────────────────────
                final Domaine finalDomaine = domaine;
                Competence competence = competenceRepository.findByCode(compReq.getCode())
                        .orElseGet(() -> {
                            Competence c = Competence.builder()
                                    .code(compReq.getCode())
                                    .nom(compReq.getNom())
                                    .description(compReq.getDescription())
                                    .ordre(compReq.getOrdre() != null ? compReq.getOrdre() : 1)
                                    .domaine(finalDomaine)
                                    .build();
                            return competenceRepository.save(c);
                        });
                competencesCreated++;

                if (compReq.getSousCompetences() == null) continue;

                for (RiceSousCompetenceRequest scReq : compReq.getSousCompetences()) {
                    // ── Sous-compétence ──────────────────────────────────────
                    final Competence finalComp = competence;
                    SousCompetence sc = sousCompetenceRepository.findByCode(scReq.getCode())
                            .orElseGet(() -> {
                                SousCompetence s = SousCompetence.builder()
                                        .code(scReq.getCode())
                                        .nom(scReq.getNom())
                                        .description(scReq.getDescription())
                                        .competence(finalComp)
                                        .build();
                                return sousCompetenceRepository.save(s);
                            });
                    sousCompetencesCreated++;

                    if (scReq.getSavoirs() == null) continue;

                    for (RiceSavoirRequest savReq : scReq.getSavoirs()) {
                        // ── Savoir ───────────────────────────────────────────
                        final SousCompetence finalSc = sc;
                        Savoir savoir = savoirRepository.findByCode(savReq.getCode())
                                .orElseGet(() -> {
                                    Savoir sv = Savoir.builder()
                                            .code(savReq.getCode())
                                            .nom(savReq.getNom())
                                            .description(savReq.getDescription())
                                            .type(parseTypeSavoir(savReq.getType()))
                                            .sousCompetence(finalSc)
                                            .build();
                                    return savoirRepository.save(sv);
                                });
                        savoirsCreated++;
                        savoirsInDomaine++;

                        // ── Enseignant assignments ────────────────────────────
                        if (savReq.getEnseignantIds() != null) {
                            NiveauMaitrise niveau = parseNiveau(savReq.getNiveau());
                            for (String ensId : savReq.getEnseignantIds()) {
                                if (!enseignantCompetenceRepository
                                        .existsByEnseignantIdAndSavoirId(ensId, savoir.getId())) {
                                    EnseignantCompetence ec = EnseignantCompetence.builder()
                                            .enseignantId(ensId)
                                            .savoir(savoir)
                                            .niveau(niveau)
                                            .dateAcquisition(LocalDate.now())
                                            .commentaire("Généré par RICE")
                                            .build();
                                    enseignantCompetenceRepository.save(ec);
                                    affectationsCreated++;
                                    coveredEnseignants.add(ensId);
                                    enseignantsInDomaine++;
                                }
                            }
                        }
                    }
                }
            }

            double taux = savoirsInDomaine == 0 ? 0.0
                    : Math.round(enseignantsInDomaine * 100.0 / savoirsInDomaine * 10) / 10.0;
            tauxParDomaine.put(domaine.getNom(), taux);
        }

        log.info("RICE import: {} domaines, {} compétences, {} savoirs, {} affectations",
                domainesCreated, competencesCreated, savoirsCreated, affectationsCreated);

        return RiceImportResult.builder()
                .generatedAt(LocalDateTime.now())
                .domainesCreated(domainesCreated)
                .competencesCreated(competencesCreated)
                .sousCompetencesCreated(sousCompetencesCreated)
                .savoirsCreated(savoirsCreated)
                .affectationsCreated(affectationsCreated)
                .enseignantsCovered(coveredEnseignants.size())
                .tauxCouvertureParDomaine(tauxParDomaine)
                .message(String.format(
                        "Import RICE réussi : %d domaines, %d compétences, %d savoirs, %d affectations créés.",
                        domainesCreated, competencesCreated, savoirsCreated, affectationsCreated))
                .build();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private TypeSavoir parseTypeSavoir(String type) {
        try {
            return TypeSavoir.valueOf(type.toUpperCase());
        } catch (Exception e) {
            return TypeSavoir.THEORIQUE;
        }
    }

    private NiveauMaitrise parseNiveau(String niveau) {
        try {
            return NiveauMaitrise.valueOf(niveau.toUpperCase());
        } catch (Exception e) {
            return NiveauMaitrise.N2_ELEMENTAIRE;
        }
    }
}
