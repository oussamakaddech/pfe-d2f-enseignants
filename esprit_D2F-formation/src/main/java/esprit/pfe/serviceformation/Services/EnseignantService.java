package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.DTO.EnseignantDTO;
import esprit.pfe.serviceformation.Entities.Enseignant;
import java.util.List;

public interface EnseignantService {
    Enseignant createEnseignant(Enseignant enseignant);
    Enseignant updateEnseignant(String id, Enseignant enseignant);
    void deleteEnseignant(String id);
    Enseignant getEnseignantById(String id);
     List<EnseignantDTO> getAllEnseignantsDTO();
}
