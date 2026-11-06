package tn.esprit.d2f.competence.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import tn.esprit.d2f.competence.dto.AffectationGroupeeRequest;
import tn.esprit.d2f.competence.dto.AffectationGroupeeResultDTO;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceDTO;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceRequest;
import tn.esprit.d2f.competence.dto.PerimetreAffectationDTO;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

import java.util.List;

public interface IEnseignantCompetenceService {
    Page<EnseignantCompetenceDTO> getAll(Pageable pageable);
    List<EnseignantCompetenceDTO> getCompetencesByEnseignant(String enseignantId);
    Page<EnseignantCompetenceDTO> getCompetencesByEnseignant(String enseignantId, Pageable pageable);
    List<EnseignantCompetenceDTO> getCompetencesByEnseignantAndDomaine(String enseignantId, Long domaineId);
    Page<EnseignantCompetenceDTO> getCompetencesByEnseignantAndDomaine(String enseignantId, Long domaineId, Pageable pageable);
    List<EnseignantCompetenceDTO> getCompetencesByEnseignantAndCompetence(String enseignantId, Long competenceId);
    Page<EnseignantCompetenceDTO> getCompetencesByEnseignantAndCompetence(String enseignantId, Long competenceId, Pageable pageable);
    List<EnseignantCompetenceDTO> getCompetencesByEnseignantAndNiveau(String enseignantId, NiveauMaitrise niveau);
    Page<EnseignantCompetenceDTO> getCompetencesByEnseignantAndNiveau(String enseignantId, NiveauMaitrise niveau, Pageable pageable);
    /** Tous les enseignants-compétence liés à une compétence donnée */
    List<EnseignantCompetenceDTO> getByCompetenceId(Long competenceId);
    Page<EnseignantCompetenceDTO> getByCompetenceId(Long competenceId, Pageable pageable);
    EnseignantCompetenceDTO assignCompetence(EnseignantCompetenceRequest request);

    /**
     * Affecte en une fois tous les savoirs d'un périmètre (compétence entière,
     * sous-compétence et ses descendantes, ou liste explicite de savoirs).
     * Les savoirs déjà affectés à l'enseignant sont conservés tels quels.
     */
    AffectationGroupeeResultDTO assignGroupee(AffectationGroupeeRequest request);
    EnseignantCompetenceDTO updateNiveau(Long id, NiveauMaitrise niveau);
    void removeCompetence(Long id);
    long countCompetences(String enseignantId);

    /**
     * Périmètre d'affectation de l'utilisateur connecté (UP du CUP, département
     * du chef, global pour un administrateur). Sert au filtrage de l'affichage ;
     * l'autorisation reste appliquée à chaque écriture.
     */
    PerimetreAffectationDTO getPerimetre();
}
