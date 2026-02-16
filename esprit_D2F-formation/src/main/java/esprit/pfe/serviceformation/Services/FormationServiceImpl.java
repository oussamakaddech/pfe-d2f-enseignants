package esprit.pfe.serviceformation.Services;



import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Repositories.FormationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class FormationServiceImpl implements FormationService {

    @Autowired
    private FormationRepository formationRepository;

    @Override
    public Formation createFormation(Formation formation) {
        return formationRepository.save(formation);
    }

    @Override
    public Formation updateFormation(Long id, Formation formation) {
        Optional<Formation> existingFormation = formationRepository.findById(id);
        if(existingFormation.isPresent()){
            Formation f = existingFormation.get();
            // Mise à jour des champs de la formation
            f.setTitreFormation(formation.getTitreFormation());
            f.setTypeFormation(formation.getTypeFormation());
            f.setDateDebut(formation.getDateDebut());
            f.setDateFin(formation.getDateFin());
            f.setEtatFormation(formation.getEtatFormation());
            f.setCoutFormation(formation.getCoutFormation());
            f.setOrganismeRefExterne(formation.getOrganismeRefExterne());
            f.setChargeHoraireGlobal(formation.getChargeHoraireGlobal());
            // Mettez à jour les associations si nécessaire
            return formationRepository.save(f);
        } else {
            throw new RuntimeException("Formation introuvable avec l'id : " + id);
        }
    }

    @Override
    public void deleteFormation(Long id) {
        formationRepository.deleteById(id);
    }

    @Override
    @Transactional
    public Formation getFormationById(Long id) {
        Formation formation = formationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Formation introuvable avec l'id : " + id));

        // Forcer le chargement des collections
        formation.getSeances().size();

        return formation;
    }
    @Override
    public List<Formation> getAllFormations() {
        return formationRepository.findAll();
    }
}
