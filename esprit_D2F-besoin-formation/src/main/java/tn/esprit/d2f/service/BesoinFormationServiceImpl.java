package tn.esprit.d2f.service;


import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tn.esprit.d2f.DTO.BesoinFormationApprovedEvent;
import tn.esprit.d2f.DTO.BesoinFormationEventPublisher;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.Notification;
import tn.esprit.d2f.repository.BesoinFormationRepository;
import tn.esprit.d2f.repository.NotificationRepository;

import java.util.List;

@Slf4j
@Service
@AllArgsConstructor
public class BesoinFormationServiceImpl implements IBesoinFormationService{

    @Autowired
    BesoinFormationRepository besoinFormationRepository;
    private final BesoinFormationEventPublisher eventPublisher;

    @Autowired
    private NotificationRepository notificationRepository;
    public List<BesoinFormation> retrieveAllBesoinFormations() {
        return besoinFormationRepository.findAll();
    }

    public BesoinFormation retrieveBesoinFormation(long idBesoinFormation) {
        return besoinFormationRepository.findById(idBesoinFormation).get() ;
    }

    public BesoinFormation addBesoinFormation(BesoinFormation b) {
        return besoinFormationRepository.save(b);    }

    public void removeBesoinFormation(long idBesoinFormation) {
        besoinFormationRepository.deleteById(idBesoinFormation);
    }

    public BesoinFormation modifyBesoinFormation(BesoinFormation b, String commentaire) {
        BesoinFormation existing = besoinFormationRepository.findById(b.getIdBesionFormation()).orElseThrow();
        existing.setApprouveCUP(b.isApprouveCUP());
        existing.setApprouveChefDep(b.isApprouveChefDep());
        existing.setApprouveAdmin(b.isApprouveAdmin());
        if (Boolean.FALSE.equals(b.isApprouveCUP())) {
            Notification notif = new Notification();
            notif.setUsername(existing.getUsername());
            notif.setMessage("Malheureusement, nous regrettons que votre demande de formation soit refusée.");
            notif.setCommentaire(commentaire);
            notificationRepository.save(notif);
        }
        if (Boolean.TRUE.equals(b.isApprouveAdmin())) {
            Notification notif = new Notification();
            notif.setUsername(existing.getUsername());
            notif.setMessage("Demande de Formation acceptée , Mettez vous en contact avec les formateurs");
            notif.setCommentaire(commentaire);
            notificationRepository.save(notif);
        }


        return besoinFormationRepository.save(existing);
    }
    // src/main/java/com/example/besoin/service/BesoinFormationServiceImpl.java
    @Override
    public BesoinFormation approuverBesoin(Long id) {
        BesoinFormation b = besoinFormationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Introuvable"));

        // 1) Si déjà publié, on ne republie pas
        if (Boolean.TRUE.equals(b.getEventPublished())) {
            return b;
        }

        // 2) Sinon on approuve et on publie l’événement

        b.setEventPublished(true);            // on marque comme publié
        besoinFormationRepository.save(b);

        BesoinFormationApprovedEvent evt = BesoinFormationApprovedEvent.builder()
                .idBesoinFormation(b.getIdBesionFormation())
                .username(b.getUsername())
                .typeBesoin(b.getTypeBesoin().name())
                .objectifFormation(b.getObjectifFormation())
                .propositionAnimateur(b.getPropositionAnimateur())
                .prerequis(b.getPrerequis())
                .publicCible(b.getPublicCible())
                .nbMaxParticipants(b.getNbMaxParticipants())
                .programmeFormation(b.getProgrammeFormation())
                .dureeFormation(b.getDureeFormation())
                .theme(b.getTheme())
                .objectifsOperationnels(b.getObjectifsOperationnels())
                .objectifsPedagogiques(b.getObjectifsPedagogiques())
                .methodesPedagogiques(b.getMethodesPedagogiques())
                .moyensPedagogiques(b.getMoyensPedagogiques())
                .methodesEvaluationAcquis(b.getMethodesEvaluationAcquis())
                .profilFormateur(b.getProfilFormateur())
                .up(b.getUp())
                .departement(b.getDepartement())
                .approuveCUP(b.getApprouveCUP())
                .approuveChefDep(b.getApprouveChefDep())
                .approuveAdmin(b.getApprouveAdmin())
                .notificationMessage(b.getNotificationMessage())
                .build();

        eventPublisher.publish(evt);
        return b;
    }
    @Override
    public List<BesoinFormation> retrieveApprovedBesoinFormations() {
        return besoinFormationRepository.findByApprouveAdminTrue();
    }

}
