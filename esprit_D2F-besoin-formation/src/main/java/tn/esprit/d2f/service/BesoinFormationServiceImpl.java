package tn.esprit.d2f.service;


import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.dto.BesoinFormationResponse;
import tn.esprit.d2f.mapper.BesoinFormationMapper;
import tn.esprit.d2f.dto.BesoinFormationApprovedEvent;
import tn.esprit.d2f.dto.BesoinFormationEventPublisher;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.Notification;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.repository.BesoinFormationRepository;
import tn.esprit.d2f.repository.NotificationRepository;

@Slf4j
@Service
public class BesoinFormationServiceImpl implements IBesoinFormationService{

    private final BesoinFormationRepository besoinFormationRepository;
    private final BesoinFormationEventPublisher eventPublisher;
    private final NotificationRepository notificationRepository;
    private final BesoinFormationMapper besoinFormationMapper;

    public BesoinFormationServiceImpl(BesoinFormationRepository besoinFormationRepository,
                                      BesoinFormationEventPublisher eventPublisher,
                                      NotificationRepository notificationRepository,
                                      BesoinFormationMapper besoinFormationMapper) {
        this.besoinFormationRepository = besoinFormationRepository;
        this.eventPublisher = eventPublisher;
        this.notificationRepository = notificationRepository;
        this.besoinFormationMapper = besoinFormationMapper;
    }

    public Page<BesoinFormationResponse> retrieveAllBesoinFormations(Pageable pageable) {
        return besoinFormationRepository.findAll(pageable).map(besoinFormationMapper::toResponse);
    }

    public BesoinFormationResponse retrieveBesoinFormation(long idBesoinFormation) {
        BesoinFormation b = besoinFormationRepository.findById(idBesoinFormation)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Besoin de formation introuvable avec l'ID : " + idBesoinFormation));
        return besoinFormationMapper.toResponse(b);
    }

    public BesoinFormationResponse addBesoinFormation(BesoinFormationRequest request) {
        BesoinFormation b = besoinFormationMapper.toEntity(request);
        return besoinFormationMapper.toResponse(besoinFormationRepository.save(b));
    }

    public void removeBesoinFormation(long idBesoinFormation) {
        besoinFormationRepository.deleteById(idBesoinFormation);
    }

    public BesoinFormationResponse modifyBesoinFormation(BesoinFormationRequest b) {
        BesoinFormation existing = besoinFormationRepository.findById(b.getIdBesoinFormation()).orElseThrow();
        
        // Mettre à jour les champs de données
        if (b.getTitre() != null) existing.setTitre(b.getTitre());
        if (b.getObjectifFormation() != null) existing.setObjectifFormation(b.getObjectifFormation());
        if (b.getTypeBesoin() != null) existing.setTypeBesoin(b.getTypeBesoin());
        if (b.getPriorite() != null) existing.setPriorite(b.getPriorite());
        if (b.getImpactStrategique() != null) existing.setImpactStrategique(b.getImpactStrategique());
        if (b.getPropositionAnimateur() != null) existing.setPropositionAnimateur(b.getPropositionAnimateur());
        if (b.getHoraireSouhaite() != null) existing.setHoraireSouhaite(b.getHoraireSouhaite());
        if (b.getUp() != null) existing.setUp(b.getUp());
        if (b.getDepartement() != null) existing.setDepartement(b.getDepartement());
        if (b.getEstOuverte() != null) existing.setEstOuverte(b.getEstOuverte());
        if (b.getAutresInformations() != null) existing.setAutresInformations(b.getAutresInformations());
        if (b.getPeriodCode() != null) existing.setPeriodCode(b.getPeriodCode());
        if (b.getCustomPeriodLabel() != null) existing.setCustomPeriodLabel(b.getCustomPeriodLabel());

        // Logique de notification (conservée)
        if (b.getApprouveCUP() != null) existing.setApprouveCUP(b.getApprouveCUP());
        if (b.getApprouveChefDep() != null) existing.setApprouveChefDep(b.getApprouveChefDep());
        if (b.getApprouveAdmin() != null) existing.setApprouveAdmin(b.getApprouveAdmin());
        
        if (Boolean.FALSE.equals(existing.isApprouveCUP())) {
            Notification notif = new Notification();
            notif.setUsername(existing.getUsername());
            notif.setMessage("Malheureusement, nous regrettons que votre demande de formation soit refusée.");
            notif.setCommentaire(b.getCommentaire());
            notificationRepository.save(notif);
        }
        if (Boolean.TRUE.equals(existing.isApprouveAdmin())) {
            Notification notif = new Notification();
            notif.setUsername(existing.getUsername());
            notif.setMessage("Demande de Formation acceptée , Mettez vous en contact avec les formateurs");
            notif.setCommentaire(b.getCommentaire());
            notificationRepository.save(notif);
        }

        return besoinFormationMapper.toResponse(besoinFormationRepository.save(existing));
    }

    @Override
    public BesoinFormationResponse approuverBesoin(Long id) {
        BesoinFormation b = besoinFormationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Introuvable"));

        b.setApprouveAdmin(true);
        besoinFormationRepository.save(b);

        if (Boolean.TRUE.equals(b.getEventPublished())) {
            return besoinFormationMapper.toResponse(b);
        }

        b.setEventPublished(true);
        besoinFormationRepository.save(b);

        BesoinFormationApprovedEvent evt = BesoinFormationApprovedEvent.builder()
                .idBesoinFormation(b.getIdBesoinFormation())
                .username(b.getUsername())
                .typeBesoin(b.getTypeBesoin() != null ? b.getTypeBesoin().name() : null)
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
                .titre(b.getTitre())
                .horaireSouhaite(b.getHoraireSouhaite())
                .up(b.getUp())
                .departement(b.getDepartement())
                .approuveCUP(b.getApprouveCUP())
                .approuveChefDep(b.getApprouveChefDep())
                .approuveAdmin(b.getApprouveAdmin())
                .notificationMessage(b.getNotificationMessage())
                .periodCode(b.getPeriodCode() != null ? b.getPeriodCode().name() : null)
                .customPeriodLabel(b.getCustomPeriodLabel())
                .build();

        try {
            eventPublisher.publish(evt);
        } catch (Exception e) {
            log.error("Failed to publish BesoinFormationApprovedEvent for id " + b.getIdBesoinFormation() + ": " + e.getMessage());
        }
        return besoinFormationMapper.toResponse(b);
    }

    @Override
    public Page<BesoinFormationResponse> retrieveApprovedBesoinFormations(Pageable pageable) {
        return besoinFormationRepository.findByApprouveAdminTrue(pageable).map(besoinFormationMapper::toResponse);
    }

    @Override
    public Page<BesoinFormationResponse> retrieveByUp(String up, Pageable pageable) {
        return besoinFormationRepository.findByUp(up, pageable).map(besoinFormationMapper::toResponse);
    }

    @Override
    public Page<BesoinFormationResponse> retrieveByDepartement(String departement, Pageable pageable) {
        return besoinFormationRepository.findByDepartement(departement, pageable).map(besoinFormationMapper::toResponse);
    }

    @Override
    public Page<BesoinFormationResponse> retrieveAllByPriorite(Pageable pageable) {
        return besoinFormationRepository.findAllByOrderByPrioriteDesc(pageable).map(besoinFormationMapper::toResponse);
    }

    @Override
    public Page<BesoinFormationResponse> retrieveByPriorite(Priorite priorite, Pageable pageable) {
        return besoinFormationRepository.findByPriorite(priorite, pageable).map(besoinFormationMapper::toResponse);
    }
}

