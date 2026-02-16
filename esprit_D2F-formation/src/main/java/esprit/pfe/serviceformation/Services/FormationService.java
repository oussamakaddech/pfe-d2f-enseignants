package esprit.pfe.serviceformation.Services;


import esprit.pfe.serviceformation.Entities.Formation;
import java.util.List;

public interface FormationService {
    Formation createFormation(Formation formation);
    Formation updateFormation(Long id, Formation formation);
    void deleteFormation(Long id);
    Formation getFormationById(Long id);
    List<Formation> getAllFormations();
}
