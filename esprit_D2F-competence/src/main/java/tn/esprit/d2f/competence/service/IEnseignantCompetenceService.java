package tn.esprit.d2f.competence.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceDTO;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceRequest;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

import java.util.List;

public interface IEnseignantCompetenceService {
    Page<EnseignantCompetenceDTO> getAll(Pageable pageable);
    List<EnseignantCompetenceDTO> getCompetencesByEnseignant(String enseignantId);
    List<EnseignantCompetenceDTO> getCompetencesByEnseignantAndDomaine(String enseignantId, Long domaineId);
    List<EnseignantCompetenceDTO> getCompetencesByEnseignantAndCompetence(String enseignantId, Long competenceId);
    List<EnseignantCompetenceDTO> getCompetencesByEnseignantAndNiveau(String enseignantId, NiveauMaitrise niveau);
    /** Tous les enseignants-compétence liés à une compétence donnée */
    List<EnseignantCompetenceDTO> getByCompetenceId(Long competenceId);
    EnseignantCompetenceDTO assignCompetence(EnseignantCompetenceRequest request);
    EnseignantCompetenceDTO updateNiveau(Long id, NiveauMaitrise niveau);
    void removeCompetence(Long id);
    long countCompetences(String enseignantId);
}
