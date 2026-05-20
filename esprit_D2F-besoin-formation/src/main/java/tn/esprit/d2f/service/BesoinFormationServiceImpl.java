package tn.esprit.d2f.service;


import lombok.extern.slf4j.Slf4j;
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
        updateDataFields(b, existing);
        updateApprovalFields(b, existing);
        handleNotifications(existing, b.getCommentaire());
        return besoinFormationMapper.toResponse(besoinFormationRepository.save(existing));
    }

    private void updateDataFields(BesoinFormationRequest src, BesoinFormation dest) {
        if (src.getTitre() != null) dest.setTitre(src.getTitre());
        if (src.getObjectifFormation() != null) dest.setObjectifFormation(src.getObjectifFormation());
        if (src.getTypeBesoin() != null) dest.setTypeBesoin(src.getTypeBesoin());
        if (src.getPriorite() != null) dest.setPriorite(src.getPriorite());
        if (src.getImpactStrategique() != null) dest.setImpactStrategique(src.getImpactStrategique());
        if (src.getPropositionAnimateur() != null) dest.setPropositionAnimateur(src.getPropositionAnimateur());
        if (src.getHoraireSouhaite() != null) dest.setHoraireSouhaite(src.getHoraireSouhaite());
        if (src.getUp() != null) dest.setUp(src.getUp());
        if (src.getDepartement() != null) dest.setDepartement(src.getDepartement());
        if (src.getEstOuverte() != null) dest.setEstOuverte(src.getEstOuverte());
        if (src.getAutresInformations() != null) dest.setAutresInformations(src.getAutresInformations());
        if (src.getPeriodCode() != null) dest.setPeriodCode(src.getPeriodCode());
        if (src.getCustomPeriodLabel() != null) dest.setCustomPeriodLabel(src.getCustomPeriodLabel());
    }

    private void updateApprovalFields(BesoinFormationRequest src, BesoinFormation dest) {
        if (src.getApprouveCUP() != null) dest.setApprouveCUP(src.getApprouveCUP());
        if (src.getApprouveChefDep() != null) dest.setApprouveChefDep(src.getApprouveChefDep());
        if (src.getApprouveAdmin() != null) dest.setApprouveAdmin(src.getApprouveAdmin());
    }

    private void handleNotifications(BesoinFormation existing, String commentaire) {
        if (Boolean.FALSE.equals(existing.isApprouveCUP())) {
            createNotification(existing.getUsername(),
                    "Malheureusement, nous regrettons que votre demande de formation soit refusée.", commentaire);
        }
        if (Boolean.TRUE.equals(existing.isApprouveAdmin())) {
            createNotification(existing.getUsername(),
                    "Demande de Formation acceptée , Mettez vous en contact avec les formateurs", commentaire);
        }
    }

    private void createNotification(String username, String message, String commentaire) {
        Notification notif = new Notification();
        notif.setUsername(username);
        notif.setMessage(message);
        notif.setCommentaire(commentaire);
        notificationRepository.save(notif);
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
                .dateDebut(b.getDateDebut())
                .dateFin(b.getDateFin())
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

