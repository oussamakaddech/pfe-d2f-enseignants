package esprit.pfe.serviceformation.services;



import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.repositories.FormationRepository;
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
            f.setPeriodCode(formation.getPeriodCode());
            f.setCustomPeriodLabel(formation.getCustomPeriodLabel());
            // Mettez à jour les associations si nécessaire
            return formationRepository.save(f);
        } else {
            throw new IllegalArgumentException("Formation introuvable avec l'id : " + id);
        }
    }

    @Override
    public void deleteFormation(Long id) {
        if (!formationRepository.existsById(id)) {
            throw new IllegalArgumentException("Impossible de supprimer : Formation introuvable avec l'id : " + id);
        }
        formationRepository.deleteById(id);
    }

    @Override
    @Transactional
    public Formation getFormationById(Long id) {
        return formationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Formation introuvable avec l'id : " + id));
    }
    @Override
    @Transactional(readOnly = true)
    public List<Formation> getAllFormations() {
        List<Formation> formations = formationRepository.findAll();
        formations.forEach(f -> {
            if (f.getSeances() != null) f.getSeances().size();
            if (f.getFormationCompetences() != null) f.getFormationCompetences().size();
            if (f.getInscriptions() != null) f.getInscriptions().size();
        });
        return formations;
    }
}
