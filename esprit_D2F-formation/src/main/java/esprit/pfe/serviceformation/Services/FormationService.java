package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Formation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface FormationService {
    Formation createFormation(Formation formation);
    Formation updateFormation(Long id, Formation formation);
    void deleteFormation(Long id);
    Formation getFormationById(Long id);
    Page<Formation> getAllFormations(Pageable pageable);
}
