package tn.esprit.d2f.service;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tn.esprit.d2f.config.AffectationProducer;
import tn.esprit.d2f.entity.Competence;
import tn.esprit.d2f.entity.CompetenceAffectationDTO;
import tn.esprit.d2f.entity.SavoirAffectationDTO;
import tn.esprit.d2f.repository.CompetenceRepository;

import java.util.List;

@Slf4j
@Service
@AllArgsConstructor
public class CompetenceServiceImpl implements ICompetenceService{

    @Autowired
    CompetenceRepository competenceRepository;

    @Autowired
    AffectationProducer affectationProducer;
    public List<Competence> retrieveAllCompetences() {
        return competenceRepository.findAll();
    }

    public Competence retrieveCompetence(long idCompetence) {
        return competenceRepository.findById(idCompetence).get() ;
    }

    public Competence addCompetence(Competence b) {
        return competenceRepository.save(b);    }

    public void removeCompetence(long idCompetence) {
        competenceRepository.deleteById(idCompetence);
    }

    public Competence modifyCompetence(Competence Competence) {
        return competenceRepository.save(Competence);
    }

    public void affecterSavoirsACompetence(Long savoirId, List<Long> competencesIds) {
        SavoirAffectationDTO dto = new SavoirAffectationDTO() ;
        dto.setSavoirId(savoirId);
        dto.setCompetencesIds(competencesIds);

        affectationProducer.sendAffectation(dto);
    }
}
