package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Entities.FormationCompetence;
import esprit.pfe.serviceformation.Repositories.FormationCompetenceRepository;
import esprit.pfe.serviceformation.Repositories.FormationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class FormationCompetenceService {

    @Autowired
    private FormationCompetenceRepository formationCompetenceRepository;

    @Autowired
    private FormationRepository formationRepository;

    /** Récupérer les liaisons formation-compétence pour une formation */
    public List<FormationCompetence> getByFormationId(Long formationId) {
        return formationCompetenceRepository.findByFormationIdFormation(formationId);
    }

    /** Ajouter une liaison formation-compétence */
    @Transactional
    public FormationCompetence addFormationCompetence(Long formationId, FormationCompetence fc) {
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new IllegalArgumentException("Formation introuvable : " + formationId));
        fc.setFormation(formation);
        return formationCompetenceRepository.save(fc);
    }

    /** Mettre à jour une liaison formation-compétence */
    @Transactional
    public FormationCompetence updateFormationCompetence(Long id, FormationCompetence updated) {
        FormationCompetence existing = formationCompetenceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Liaison introuvable : " + id));
        existing.setDomaineId(updated.getDomaineId());
        existing.setCompetenceId(updated.getCompetenceId());
        existing.setCompetenceNom(updated.getCompetenceNom());
        existing.setSousCompetenceId(updated.getSousCompetenceId());
        existing.setSousCompetenceNom(updated.getSousCompetenceNom());
        existing.setSavoirId(updated.getSavoirId());
        existing.setSavoirNom(updated.getSavoirNom());
        existing.setSavoirType(updated.getSavoirType());
        existing.setNiveauPrerequis(updated.getNiveauPrerequis());
        existing.setNiveauVise(updated.getNiveauVise());
        return formationCompetenceRepository.save(existing);
    }

    /** Supprimer une liaison formation-compétence */
    @Transactional
    public void deleteFormationCompetence(Long id) {
        formationCompetenceRepository.deleteById(id);
    }

    /** Remplacer toutes les liaisons pour une formation (utilisé lors de la création/mise à jour) */
    @Transactional
    public List<FormationCompetence> replaceAllForFormation(Long formationId, List<FormationCompetence> newLinks) {
        formationCompetenceRepository.deleteByFormationIdFormation(formationId);
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new IllegalArgumentException("Formation introuvable : " + formationId));
        for (FormationCompetence fc : newLinks) {
            fc.setId(null);
            fc.setFormation(formation);
        }
        return formationCompetenceRepository.saveAll(newLinks);
    }

    /** Récupérer les formations liées à une compétence */
    public List<FormationCompetence> getByCompetenceId(Long competenceId) {
        return formationCompetenceRepository.findByCompetenceId(competenceId);
    }

    /** Récupérer les formations liées à un domaine */
    public List<FormationCompetence> getByDomaineId(Long domaineId) {
        return formationCompetenceRepository.findByDomaineId(domaineId);
    }
}