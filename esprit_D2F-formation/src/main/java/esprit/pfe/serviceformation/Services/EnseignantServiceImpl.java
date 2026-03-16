package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.DTO.EnseignantDTO;
import esprit.pfe.serviceformation.Entities.Enseignant;
import esprit.pfe.serviceformation.Repositories.EnseignantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
public class EnseignantServiceImpl implements EnseignantService {

    @Autowired
    private EnseignantRepository enseignantRepository;

    @Override
    @Transactional
    public Enseignant createEnseignant(Enseignant enseignant) {
        // Auto-generate ID in format E00001, E00002, … if not provided
        if (enseignant.getId() == null || enseignant.getId().isBlank()) {
            String nextId = enseignantRepository.findTopByOrderByIdDesc()
                    .map(last -> {
                        String lastId = last.getId(); // e.g. "E00042"
                        try {
                            // Strip leading non-digits and parse
                            int num = Integer.parseInt(lastId.replaceAll("\\D", ""));
                            return String.format("E%05d", num + 1);
                        } catch (NumberFormatException e) {
                            return "E00001";
                        }
                    })
                    .orElse("E00001");
            enseignant.setId(nextId);
        }
        // Default mandatory fields not provided from the creation form
        if (enseignant.getCup() == null || enseignant.getCup().isBlank()) {
            enseignant.setCup("N");
        }
        if (enseignant.getChefDepartement() == null || enseignant.getChefDepartement().isBlank()) {
            enseignant.setChefDepartement("N");
        }
        return enseignantRepository.save(enseignant);
    }

    @Override
    public Enseignant updateEnseignant(String id, Enseignant enseignant) {
        Optional<Enseignant> existingEnseignant = enseignantRepository.findById(id);
        if(existingEnseignant.isPresent()){
            Enseignant e = existingEnseignant.get();
            // Mise à jour des attributs de l'enseignant
            e.setNom(enseignant.getNom());
            e.setPrenom(enseignant.getPrenom());
            e.setType(enseignant.getType());
            e.setEtat(enseignant.getEtat());
            e.setCup(enseignant.getCup());
            e.setChefDepartement(enseignant.getChefDepartement());
            e.setUp(enseignant.getUp());
            e.setDept(enseignant.getDept());
            // Vous pouvez ajouter la mise à jour des associations si nécessaire
            return enseignantRepository.save(e);
        } else {
            throw new RuntimeException("Enseignant introuvable avec l'id : " + id);
        }
    }

    @Override
    public void deleteEnseignant(String id) {
        enseignantRepository.deleteById(id);
    }

    @Override
    public Enseignant getEnseignantById(String id) {
        return enseignantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Enseignant introuvable avec l'id : " + id));
    }


    public List<EnseignantDTO> getAllEnseignantsDTO() {
        // 1) Récupérer tous les enseignants en JOIN FETCH
        List<Enseignant> enseignants = enseignantRepository.findAll();

        // 2) Mapper vers DTO
        return enseignants.stream().map(this::mapToDTO).toList();
    }

    private EnseignantDTO mapToDTO(Enseignant e) {
        EnseignantDTO dto = new EnseignantDTO();
        dto.setId(e.getId());
        dto.setNom(e.getNom());
        dto.setPrenom(e.getPrenom());
        dto.setMail(e.getMail());
        dto.setType(e.getType());
        // On remplit upLibelle et deptLibelle si up / dept ne sont pas null
        if (e.getUp() != null) {
            dto.setUpLibelle(e.getUp().getLibelle());
        }
        if (e.getDept() != null) {
            dto.setDeptLibelle(e.getDept().getLibelle());
        }
        return dto;
    }
}

