package tn.esprit.d2f.service;

import tn.esprit.d2f.entity.Competence;

import java.util.List;

public interface ICompetenceService {
    public List<Competence> retrieveAllCompetences() ;
    public Competence retrieveCompetence(long idCompetence) ;
    public Competence addCompetence(Competence c) ;
    public void removeCompetence(long idCompetence) ;
    public Competence modifyCompetence(Competence Competence) ;
}
