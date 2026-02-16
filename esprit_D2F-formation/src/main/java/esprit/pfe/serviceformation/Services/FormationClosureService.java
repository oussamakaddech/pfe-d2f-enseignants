package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Entities.SeanceFormation;
import esprit.pfe.serviceformation.Entities.Enseignant;
import esprit.pfe.serviceformation.Repositories.FormationRepository;
import esprit.pfe.serviceformation.Repositories.SeanceFormationRepository;
import esprit.pfe.serviceformation.Repositories.PresenceRepository;
import esprit.pfe.serviceformation.messaging.CertificateBatchMessage;
import esprit.pfe.serviceformation.messaging.CertificateEventPublisher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class FormationClosureService {

    @Autowired
    private FormationRepository formationRepository;

    @Autowired
    private SeanceFormationRepository seanceFormationRepository;

    @Autowired
    private PresenceRepository presenceRepository;

    @Autowired
    private CertificateEventPublisher certificateEventPublisher; // JMS Publisher

    /**
     * Génère les certificats (ou attestations, badges...) pour la formation,
     * en distinguant animateurs et participants,
     * et choisissant typeCertif = "CERTIF", "BADGE", "ATTESTATION", etc.
     * N'envoie qu'une seule fois (si certifGenerated=false).
     *
     * @param formationId l'ID de la formation
     * @param typeCertif  le type de certificat à générer
     */
    @Transactional
    public void generateCertificates(Long formationId, String typeCertif) {
        // 1) Récupérer la formation
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new RuntimeException(
                        "Formation introuvable: " + formationId));

        // 2) Vérifier si déjà généré
        if (formation.isCertifGenerated()) {
            throw new RuntimeException(
                    "❌ Les certificats ont déjà été générés pour cette formation !");
        }

        // 3) Récupérer toutes les séances de la formation
        List<SeanceFormation> seances =
                seanceFormationRepository.findByFormationId(formationId);

        // 4) Construire la map des rôles (ANIMATEUR > PARTICIPANT)
        Map<String, String> rolesByEnseignant = new HashMap<>();
        for (SeanceFormation sf : seances) {
            if (sf.getAnimateurs() != null) {
                sf.getAnimateurs().forEach(anim -> {
                    String old = rolesByEnseignant.get(anim.getId());
                    if (old == null || "PARTICIPANT".equals(old)) {
                        rolesByEnseignant.put(anim.getId(), "ANIMATEUR");
                    }
                });
            }
            if (sf.getParticipants() != null) {
                sf.getParticipants().forEach(part -> {
                    rolesByEnseignant
                            .putIfAbsent(part.getId(), "PARTICIPANT");
                });
            }
        }

        // 5) Récupérer les enseignants présents sur TOUTES les séances
        List<Enseignant> enseignantsPleinPrésence =
                presenceRepository
                        .findEnseignantsPresentSurToutesLesSeances(formationId);

        // 6) Construire la liste d'EnseignantPresenceInfo
        List<CertificateBatchMessage.EnseignantPresenceInfo> batchInfos =
                enseignantsPleinPrésence.stream().map(e -> {
                    CertificateBatchMessage.EnseignantPresenceInfo info =
                            new CertificateBatchMessage.EnseignantPresenceInfo();
                    info.setEnseignantId(e.getId());
                    info.setNom(e.getNom());
                    info.setPrenom(e.getPrenom());
                    info.setMail(e.getMail());
                    // rôle calculé précédemment
                    info.setRole(
                            rolesByEnseignant.getOrDefault(e.getId(), "PARTICIPANT")
                    );
                    info.setPresent(true);
                    info.setDeptEnseignantLibelle(
                            e.getDept() != null ? e.getDept().getLibelle() : null
                    );
                    return info;
                }).toList();

        // 7) Construire et envoyer le message JMS
        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setFormationId(formationId);
        msg.setTitreFormation(formation.getTitreFormation());
        msg.setTypeCertif(typeCertif);
        msg.setDateDebutFormation(formation.getDateDebut());
        msg.setDateFinFormation(formation.getDateFin());
        msg.setChargeHoraireGlobal(formation.getChargeHoraireGlobal());
        msg.setEnseignants(batchInfos);

        certificateEventPublisher.sendCertificateBatchMessage(msg);

        // 8) Marquer la formation comme générée
        formation.setCertifGenerated(true);
        formationRepository.save(formation);

        System.out.println(
                "✅ " + typeCertif + " générés pour formation " + formationId
                        + " => " + batchInfos.size() + " enseignants."
        );
    }
}
