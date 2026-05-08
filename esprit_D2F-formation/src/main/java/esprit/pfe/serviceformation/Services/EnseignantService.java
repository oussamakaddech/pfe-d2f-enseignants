package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.EnseignantDTO;
import esprit.pfe.serviceformation.entities.Enseignant;
import java.util.List;

public interface EnseignantService {
    Enseignant createEnseignant(Enseignant enseignant);
    Enseignant updateEnseignant(String id, Enseignant enseignant);
    void deleteEnseignant(String id);
    Enseignant getEnseignantById(String id);
     List<EnseignantDTO> getAllEnseignantsDTO();
}
