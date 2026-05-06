package tn.esprit.d2f.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import tn.esprit.d2f.DTO.BesoinFormationRequest;
import tn.esprit.d2f.DTO.BesoinFormationResponse;
import tn.esprit.d2f.entity.enumerations.Priorite;

public interface IBesoinFormationService {
    public Page<BesoinFormationResponse> retrieveAllBesoinFormations(Pageable pageable) ;
    public BesoinFormationResponse retrieveBesoinFormation(long idBesoinFormation) ;
    public BesoinFormationResponse addBesoinFormation(BesoinFormationRequest b) ;
    public void removeBesoinFormation(long idBesoinFormation) ;
    public BesoinFormationResponse modifyBesoinFormation(BesoinFormationRequest request) ;
    public BesoinFormationResponse approuverBesoin(Long id);
    Page<BesoinFormationResponse> retrieveApprovedBesoinFormations(Pageable pageable);

    /** §2.2.2 — Consulter les besoins par UP */
    Page<BesoinFormationResponse> retrieveByUp(String up, Pageable pageable);

    /** §2.2.2 — Consulter les besoins par département */
    Page<BesoinFormationResponse> retrieveByDepartement(String departement, Pageable pageable);

    /** §2.2.2 — Prioriser les besoins en fonction de l'urgence */
    Page<BesoinFormationResponse> retrieveAllByPriorite(Pageable pageable);

    /** §2.2.2 — Filtrage par priorité */
    Page<BesoinFormationResponse> retrieveByPriorite(Priorite priorite, Pageable pageable);
}


