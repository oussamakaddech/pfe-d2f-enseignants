package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.SeanceFormation;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import esprit.pfe.serviceformation.repositories.PresenceRepository;
import esprit.pfe.serviceformation.messaging.CertificateBatchMessage;
import esprit.pfe.serviceformation.messaging.CertificateEventPublisher;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class FormationClosureService {

    private static final String ROLE_PARTICIPANT = "PARTICIPANT";
    private final FormationRepository formationRepository;
    private final SeanceFormationRepository seanceFormationRepository;
    private final PresenceRepository presenceRepository;
    private final CertificateEventPublisher certificateEventPublisher;

    public FormationClosureService(FormationRepository formationRepository, 
                                 SeanceFormationRepository seanceFormationRepository, 
                                 PresenceRepository presenceRepository, 
                                 CertificateEventPublisher certificateEventPublisher) {
        this.formationRepository = formationRepository;
        this.seanceFormationRepository = seanceFormationRepository;
        this.presenceRepository = presenceRepository;
        this.certificateEventPublisher = certificateEventPublisher;
    }

    @Transactional
    public void generateCertificates(Long formationId, String typeCertif) {
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new IllegalStateException("Formation introuvable: " + formationId));

        if (formation.isCertifGenerated()) {
            throw new IllegalStateException("Les certificats ont deja ete generes pour cette formation !");
        }

        List<SeanceFormation> seances = seanceFormationRepository.findByFormationId(formationId);

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
                sf.getParticipants().forEach(part -> {
                    rolesByEnseignant.putIfAbsent(part.getId(), ROLE_PARTICIPANT);
                });
            }
        }

        List<Enseignant> enseignantsPleinPresence = presenceRepository.findEnseignantsPresentSurToutesLesSeances(formationId);

        List<CertificateBatchMessage.EnseignantPresenceInfo> batchInfos = enseignantsPleinPresence.stream().map(enseignant -> {
            CertificateBatchMessage.EnseignantPresenceInfo info = new CertificateBatchMessage.EnseignantPresenceInfo();
            info.setEnseignantId(enseignant.getId());
            info.setNom(enseignant.getNom());
            info.setPrenom(enseignant.getPrenom());
            info.setMail(enseignant.getMail());
            info.setRole(rolesByEnseignant.getOrDefault(enseignant.getId(), ROLE_PARTICIPANT));
            info.setPresent(true);
            info.setDeptEnseignantLibelle(enseignant.getDept() != null ? enseignant.getDept().getLibelle() : null);
            return info;
        }).toList();

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

        log.info("Certificats {} generes pour formation {} => {} enseignants.", typeCertif, formationId, batchInfos.size());
    }
}
