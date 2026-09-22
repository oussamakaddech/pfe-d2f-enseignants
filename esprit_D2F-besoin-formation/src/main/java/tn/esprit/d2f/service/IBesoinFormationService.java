package tn.esprit.d2f.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.dto.BesoinFormationResponse;
import tn.esprit.d2f.entity.Notification;
import tn.esprit.d2f.entity.enumerations.Priorite;

public interface IBesoinFormationService {
    public Page<BesoinFormationResponse> retrieveAllBesoinFormations(Pageable pageable) ;
    public BesoinFormationResponse retrieveBesoinFormation(long idBesoinFormation) ;
    public BesoinFormationResponse addBesoinFormation(BesoinFormationRequest b) ;
    public void removeBesoinFormation(long idBesoinFormation) ;
    public BesoinFormationResponse modifyBesoinFormation(BesoinFormationRequest request) ;
    public BesoinFormationResponse approuverBesoin(Long id);

    /** Refuse un besoin à l'étape courante (motif obligatoire). */
    public BesoinFormationResponse refuserBesoin(Long id, String motif);

    /** Annule son propre besoin avant toute approbation (ou ADMIN). */
    public BesoinFormationResponse annulerBesoin(Long id);

    /** Besoins en attente à l'étape de l'utilisateur connecté (rôle + périmètre serveur). */
    Page<BesoinFormationResponse> retrievePendingApproval(Pageable pageable);

    /** Besoins du périmètre de l'utilisateur connecté (CUP → son UP, chef → son département). */
    Page<BesoinFormationResponse> retrieveScope(Pageable pageable);

    /** Historique d'audit des transitions d'un besoin (ADMIN). */
    java.util.List<tn.esprit.d2f.entity.BesoinApprovalHistory> getApprovalHistory(Long id);

    /** Republication différée des événements non partis (scheduler). */
    int republishPendingEvents();
    Page<BesoinFormationResponse> retrieveApprovedBesoinFormations(Pageable pageable);

    /** §2.2.2 — Consulter les besoins par UP */
    Page<BesoinFormationResponse> retrieveByUp(String up, Pageable pageable);

    /** §2.2.2 — Consulter les besoins par département */
    Page<BesoinFormationResponse> retrieveByDepartement(String departement, Pageable pageable);

    /** §2.2.2 — Prioriser les besoins en fonction de l'urgence */
    Page<BesoinFormationResponse> retrieveAllByPriorite(Pageable pageable);

    /** §2.2.2 — Filtrage par priorité */
    Page<BesoinFormationResponse> retrieveByPriorite(Priorite priorite, Pageable pageable);

    /** §2.2.3 — Notifications d'un utilisateur */
    Page<Notification> findNotificationsByUsername(String username, Pageable pageable);

    /** §2.2.4 — Besoins personnels d'un utilisateur (ENSEIGNANT/ANIMATEUR) */
    Page<BesoinFormationResponse> retrieveByUsername(String username, Pageable pageable);
}


