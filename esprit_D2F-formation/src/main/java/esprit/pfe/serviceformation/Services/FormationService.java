package esprit.pfe.serviceformation.services;


import esprit.pfe.serviceformation.entities.Formation;
import java.util.List;

public interface FormationService {
    Formation createFormation(Formation formation);
    Formation updateFormation(Long id, Formation formation);
    void deleteFormation(Long id);
    Formation getFormationById(Long id);
    List<Formation> getAllFormations();
}
