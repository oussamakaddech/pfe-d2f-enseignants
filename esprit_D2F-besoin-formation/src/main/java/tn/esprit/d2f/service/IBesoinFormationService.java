package tn.esprit.d2f.service;

import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.enumerations.Priorite;

import java.util.List;

public interface IBesoinFormationService {
    public List<BesoinFormation> retrieveAllBesoinFormations() ;
    public BesoinFormation retrieveBesoinFormation(long idBesoinFormation) ;
    public BesoinFormation addBesoinFormation(BesoinFormation b) ;
    public void removeBesoinFormation(long idBesoinFormation) ;
    public BesoinFormation modifyBesoinFormation(BesoinFormation besoinFormation , String c) ;
    public BesoinFormation approuverBesoin(Long id);
    List<BesoinFormation> retrieveApprovedBesoinFormations();

    /** §2.2.2 — Consulter les besoins par UP */
    List<BesoinFormation> retrieveByUp(String up);

    /** §2.2.2 — Consulter les besoins par département */
    List<BesoinFormation> retrieveByDepartement(String departement);

    /** §2.2.2 — Prioriser les besoins en fonction de l'urgence */
    List<BesoinFormation> retrieveAllByPriorite();

    /** §2.2.2 — Filtrage par priorité */
    List<BesoinFormation> retrieveByPriorite(Priorite priorite);
}
