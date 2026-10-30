package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.SeanceFormation;
import esprit.pfe.serviceformation.dto.CertificateEligibilitySummaryDTO;
import esprit.pfe.serviceformation.messaging.CertificateBatchMessage;
import esprit.pfe.serviceformation.messaging.CertificateEventPublisher;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Clôture d'une formation : génération des certificats.
 *
 * <p>Un certificat n'est généré que si les critères de certification sont
 * satisfaits pour le participant (cf. {@link CertificateEligibilityService}) :
 * formation achevée, taux de présence suffisant, post-test réussi et
 * évaluation du formateur soumise. Cela évite les certificats générés par erreur.</p>
 */
@Service
@Slf4j
public class FormationClosureService {

    private static final String ROLE_PARTICIPANT = "PARTICIPANT";
    private final FormationRepository formationRepository;
    private final SeanceFormationRepository seanceFormationRepository;
    private final EnseignantRepository enseignantRepository;
    private final CertificateEventPublisher certificateEventPublisher;
    private final CertificateEligibilityService certificateEligibilityService;

    public FormationClosureService(FormationRepository formationRepository,
                                   SeanceFormationRepository seanceFormationRepository,
                                   EnseignantRepository enseignantRepository,
                                   CertificateEventPublisher certificateEventPublisher,
                                   CertificateEligibilityService certificateEligibilityService) {
        this.formationRepository = formationRepository;
        this.seanceFormationRepository = seanceFormationRepository;
        this.enseignantRepository = enseignantRepository;
        this.certificateEventPublisher = certificateEventPublisher;
        this.certificateEligibilityService = certificateEligibilityService;
    }

    @Transactional
    public void generateCertificates(Long formationId, String typeCertif) {
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new IllegalStateException("Formation introuvable: " + formationId));

        if (formation.isCertifGenerated()) {
            throw new IllegalStateException("Les certificats ont deja ete generes pour cette formation !");
        }
        if (formation.getEtatFormation() != EtatFormation.ACHEVE) {
            throw new IllegalStateException(
                    "Les certificats ne peuvent etre generes que pour une formation achevee.");
        }

        List<SeanceFormation> seances = seanceFormationRepository.findByFormationId(formationId);
        if (seances.isEmpty()) {
            throw new IllegalStateException(
                    "Les certificats ne peuvent pas etre generes sans seance de formation.");
        }

        Map<String, String> rolesByEnseignant = new HashMap<>();
        for (SeanceFormation sf : seances) {
            if (sf.getAnimateurs() != null) {
                sf.getAnimateurs().forEach(anim -> {
                    String old = rolesByEnseignant.get(anim.getId());
                    if (old == null || ROLE_PARTICIPANT.equals(old)) {
                        rolesByEnseignant.put(anim.getId(), "ANIMATEUR");
                    }
                });
            }
            if (sf.getParticipants() != null) {
                sf.getParticipants().forEach(part -> rolesByEnseignant.putIfAbsent(part.getId(), ROLE_PARTICIPANT));
            }
        }

        // Un certificat n'est produit que si TOUS les critères de certification
        // sont satisfaits pour le participant (présence, post-test, évaluation).
        List<CertificateBatchMessage.EnseignantPresenceInfo> batchInfos = new ArrayList<>();
        List<String> ineligible = new ArrayList<>();
        for (Map.Entry<String, String> entry : rolesByEnseignant.entrySet()) {
            String enseignantId = entry.getKey();
            Enseignant enseignant = enseignantRepository.findById(enseignantId).orElse(null);
            if (enseignant == null) {
                ineligible.add(enseignantId + " (enseignant introuvable)");
                continue;
            }
            CertificateEligibilitySummaryDTO summary =
                    certificateEligibilityService.evaluateEligibilityWithSummary(
                            formationId, enseignantId, typeCertif);
            if (summary.isEligible()) {
                CertificateBatchMessage.EnseignantPresenceInfo info =
                        new CertificateBatchMessage.EnseignantPresenceInfo();
                info.setEnseignantId(enseignant.getId());
                info.setNom(enseignant.getNom());
                info.setPrenom(enseignant.getPrenom());
                info.setMail(enseignant.getMail());
                info.setRole(entry.getValue());
                info.setPresent(true);
                info.setDeptEnseignantLibelle(enseignant.getDept() != null ? enseignant.getDept().getLibelle() : null);
                batchInfos.add(info);
            } else {
                ineligible.add(enseignantId + " (" + String.join("; ", summary.getRejectionReasons()) + ")");
            }
        }

        if (batchInfos.isEmpty()) {
            throw new IllegalStateException(
                    "Aucun participant ne remplit les criteres de certification. Motifs : "
                            + String.join(" | ", ineligible));
        }

        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setFormationId(formationId);
        msg.setTitreFormation(formation.getTitreFormation());
        msg.setTypeCertif(typeCertif);
        msg.setDateDebutFormation(formation.getDateDebut());
        msg.setDateFinFormation(formation.getDateFin());
        msg.setChargeHoraireGlobal(formation.getChargeHoraireGlobal());
        msg.setEnseignants(batchInfos);

        certificateEventPublisher.sendCertificateBatchMessage(msg);

        formation.setCertifGenerated(true);
        formationRepository.save(formation);

        log.info("Certificats {} generes pour formation {} => {} enseignants eligibles.",
                typeCertif, formationId, batchInfos.size());
        if (!ineligible.isEmpty()) {
            log.info("Participants exclus de la certification pour formation {} : {}", formationId, ineligible);
        }
    }
}
