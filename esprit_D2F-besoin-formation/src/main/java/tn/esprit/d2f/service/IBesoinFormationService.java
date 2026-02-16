package tn.esprit.d2f.service;

import tn.esprit.d2f.entity.BesoinFormation;

import java.util.List;

public interface IBesoinFormationService {
    public List<BesoinFormation> retrieveAllBesoinFormations() ;
    public BesoinFormation retrieveBesoinFormation(long idBesoinFormation) ;
    public BesoinFormation addBesoinFormation(BesoinFormation b) ;
    public void removeBesoinFormation(long idBesoinFormation) ;
    public BesoinFormation modifyBesoinFormation(BesoinFormation besoinFormation , String c) ;
    public BesoinFormation approuverBesoin(Long id);
    List<BesoinFormation> retrieveApprovedBesoinFormations();
}
