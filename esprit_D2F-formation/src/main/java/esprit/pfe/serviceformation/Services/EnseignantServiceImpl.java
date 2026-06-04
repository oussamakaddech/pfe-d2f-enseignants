package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.EnseignantDTO;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.exception.DuplicateEnseignantException;
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
        // Contrôle d'unicité de l'email (→ 409). La contrainte SQL ux_enseignants_mail
        // (V29) reste le garde-fou dur ; ce pré-contrôle donne un message clair.
        if (enseignant.getMail() != null && !enseignant.getMail().isBlank()
                && enseignantRepository.existsByMail(enseignant.getMail())) {
            throw new DuplicateEnseignantException(
                    "Un enseignant avec cet email existe déjà : " + enseignant.getMail());
        }
        // Auto-generate ID in format E00001, E00002, … si non fourni OU si l'id
        // fourni est déjà pris (le frontend envoie parfois un id "stable" dérivé
        // du nom qui peut entrer en collision avec un autre enseignant → sinon
        // violation de clé primaire / 500). La vérif d'unicité d'email ci-dessus
        // garantit qu'on ne duplique pas la même personne.
        if (enseignant.getId() == null || enseignant.getId().isBlank()
                || enseignantRepository.existsById(enseignant.getId())) {
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
        // type/etat sont NOT NULL en base : valeurs par défaut si non fournies.
        if (enseignant.getType() == null || enseignant.getType().isBlank()) {
            enseignant.setType("P");
        }
        if (enseignant.getEtat() == null || enseignant.getEtat().isBlank()) {
            enseignant.setEtat("A");
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
            if (enseignant.getGrade() != null)           e.setGrade(enseignant.getGrade());
            if (enseignant.getTelephone() != null)       e.setTelephone(enseignant.getTelephone());
            if (enseignant.getPhotoUrl() != null)        e.setPhotoUrl(enseignant.getPhotoUrl());
            if (enseignant.getUserId() != null)          e.setUserId(enseignant.getUserId());
            return enseignantRepository.save(e);
        } else {
            throw new IllegalStateException("Enseignant introuvable avec l'id : " + id);
        }
    }

    @Override
    @Transactional
    public void deleteEnseignant(String id) {
        // Soft delete : suppression physique impossible (FK séances/présences/inscriptions
        // → 409). On marque deleted_at ; l'enseignant est alors exclu de toutes les
        // requêtes (@SQLRestriction) et l'historique est préservé.
        Enseignant enseignant = enseignantRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException(
                        "Enseignant introuvable avec l'id : " + id));
        enseignant.setDeletedAt(java.time.LocalDateTime.now());
        enseignantRepository.save(enseignant);
    }

    @Override
    public Enseignant getEnseignantById(String id) {
        String key = id == null ? null : id.trim();
        return enseignantRepository.findById(id)
                .or(() -> enseignantRepository.findByMail(id))
                .or(() -> key == null ? Optional.empty() : enseignantRepository.findByMailIgnoreCase(key))
                .orElseThrow(() -> new IllegalArgumentException("Enseignant introuvable avec l'id ou l'email : " + id));
    }

    @Override
    public Page<EnseignantDTO> getAllEnseignantsDTO(Pageable pageable) {
        return enseignantRepository.findAll(pageable).map(this::toDTO);
    }

    public List<EnseignantDTO> getAllEnseignantsDTO() {
        return enseignantRepository.findAll().stream().map(this::toDTO).toList();
    }

    @Override
    public EnseignantDTO toDTO(Enseignant e) {
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
        dto.setGrade(e.getGrade());
        dto.setTelephone(e.getTelephone());
        dto.setPhotoUrl(e.getPhotoUrl());
        dto.setUserId(e.getUserId());
        return dto;
    }
}
