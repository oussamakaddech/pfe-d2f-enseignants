package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.EnseignantDTO;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EnseignantServiceImpl implements EnseignantService {
    private final EnseignantRepository enseignantRepository;

    @Override
    @Transactional
    public Enseignant createEnseignant(Enseignant enseignant) {
        // Auto-generate ID in format E00001, E00002, … if not provided
        if (enseignant.getId() == null || enseignant.getId().isBlank()) {
            String nextId = enseignantRepository.findTopByOrderByIdDesc()
                    .map(last -> {
                        String lastId = last.getId(); // e.g. "E00042"
                        // Strip leading non-digits and parse
                        String numericPart = lastId.replaceAll("\\D", "");
                        try {
                            int num = Integer.parseInt(numericPart);
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
    @SuppressWarnings("java:S3776")
    public Enseignant updateEnseignant(String id, Enseignant enseignant) {
        Optional<Enseignant> existingEnseignant = enseignantRepository.findById(id);
        if (existingEnseignant.isPresent()) {
            Enseignant e = existingEnseignant.get();
            // Mise à jour partielle (null-safe) : seuls les champs réellement
            // fournis sont modifiés. Un écrasement inconditionnel mettait à null
            // des colonnes NOT NULL (etat, type…) et effaçait les associations
            // up/dept quand le formulaire ne les renvoyait pas → 500 / perte de données.
            if (enseignant.getNom() != null)             e.setNom(enseignant.getNom());
            if (enseignant.getPrenom() != null)          e.setPrenom(enseignant.getPrenom());
            if (enseignant.getMail() != null)            e.setMail(enseignant.getMail());
            if (enseignant.getType() != null)            e.setType(enseignant.getType());
            if (enseignant.getEtat() != null)            e.setEtat(enseignant.getEtat());
            if (enseignant.getCup() != null)             e.setCup(enseignant.getCup());
            if (enseignant.getChefDepartement() != null) e.setChefDepartement(enseignant.getChefDepartement());
            if (enseignant.getUp() != null)              e.setUp(enseignant.getUp());
            if (enseignant.getDept() != null)            e.setDept(enseignant.getDept());
            return enseignantRepository.save(e);
        } else {
            throw new IllegalStateException("Enseignant introuvable avec l'id : " + id);
        }
    }

    @Override
    public void deleteEnseignant(String id) {
        enseignantRepository.deleteById(id);
    }

    @Override
    public Enseignant getEnseignantById(String id) {
        return enseignantRepository.findById(id)
                .or(() -> enseignantRepository.findByMail(id))
                .orElseThrow(() -> new IllegalArgumentException("Enseignant introuvable avec l'id ou l'email : " + id));
    }

    @Override
    public Page<EnseignantDTO> getAllEnseignantsDTO(Pageable pageable) {
        return enseignantRepository.findAll(pageable).map(this::mapToDTO);
    }

    public List<EnseignantDTO> getAllEnseignantsDTO() {
        return enseignantRepository.findAll().stream().map(this::mapToDTO).toList();
    }

    private EnseignantDTO mapToDTO(Enseignant e) {
        EnseignantDTO dto = new EnseignantDTO();
        dto.setId(e.getId());
        dto.setNom(e.getNom());
        dto.setPrenom(e.getPrenom());
        dto.setMail(e.getMail());
        dto.setType(e.getType());
        dto.setEtat(e.getEtat());
        // On remplit id + libellé de up / dept si présents, pour que le formulaire
        // d'édition puisse pré-remplir les sélecteurs (sinon une édition renverrait
        // des valeurs vides et risquerait d'écraser les associations).
        if (e.getUp() != null) {
            dto.setUpId(e.getUp().getId());
            dto.setUpLibelle(e.getUp().getLibelle());
        }
        if (e.getDept() != null) {
            dto.setDeptId(e.getDept().getId());
            dto.setDeptLibelle(e.getDept().getLibelle());
        }
        dto.setCup(e.getCup());
        dto.setChefDepartement(e.getChefDepartement());
        return dto;
    }
}
