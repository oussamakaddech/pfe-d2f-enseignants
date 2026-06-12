package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.EnseignantDTO;
import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.Up;
import esprit.pfe.serviceformation.exception.DuplicateEnseignantException;
import esprit.pfe.serviceformation.repositories.DeptRepository;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.UpRepository;
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
    private final UpRepository upRepository;
    private final DeptRepository deptRepository;

    @Override
    @Transactional
    public Enseignant createEnseignant(Enseignant enseignant) {
        return doCreateEnseignant(enseignant);
    }

    private Enseignant doCreateEnseignant(Enseignant enseignant) {
        // Contrôle d'unicité de l'email (→ 409). La contrainte SQL ux_enseignants_mail
        // (V29) reste le garde-fou dur ; ce pré-contrôle donne un message clair.
        if (enseignant.getMail() != null && !enseignant.getMail().isBlank()
                && enseignantRepository.existsByMail(enseignant.getMail())) {
            throw new DuplicateEnseignantException(
                    "Un enseignant avec cet email existe déjà : " + enseignant.getMail());
        }
        // Résolution des associations Up/Dept en entités MANAGÉES. Le DTO ne fournit
        // qu'un id et construit un new Up()/Dept() transient : tenter de persister
        // l'enseignant avec une telle référence non gérée lève une
        // InvalidDataAccessApiUsageException (« unsaved transient instance »), non
        // mappée → 500 générique. On recharge donc la vraie entité (ou 400 si l'id
        // est inconnu) avant le save.
        enseignant.setUp(resolveUp(enseignant.getUp()));
        enseignant.setDept(resolveDept(enseignant.getDept()));
        // Auto-generate ID au format E00001, E00002, … si non fourni OU si l'id
        // fourni est déjà pris (le frontend envoie parfois un id "stable" dérivé
        // du nom qui peut entrer en collision → sinon violation de PK / 500).
        // existsByIdIncludingDeleted : la collision se teste sur la ligne PHYSIQUE
        // (la PK enseignants_pkey couvre aussi les lignes soft-deleted), sinon un
        // id réutilisé après suppression logique repassait le contrôle puis violait
        // la PK à l'INSERT. La vérif d'unicité d'email ci-dessus garantit qu'on ne
        // duplique pas la même personne.
        if (enseignant.getId() == null || enseignant.getId().isBlank()
                || enseignantRepository.existsByIdIncludingDeleted(enseignant.getId())) {
            enseignant.setId(nextAvailableEnseignantId());
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

    /**
     * Prochain id libre au format {@code E#####}. On part du plus grand suffixe
     * numérique existant (soft-deleted inclus, cf. PK physique) puis on avance tant
     * que l'id est occupé — robuste aux trous, aux ids non conformes et aux lignes
     * supprimées qui conservent leur clé.
     */
    private String nextAvailableEnseignantId() {
        int next = enseignantRepository.findMaxNumericIdIncludingDeleted() + 1;
        String candidate = String.format("E%05d", next);
        while (enseignantRepository.existsByIdIncludingDeleted(candidate)) {
            candidate = String.format("E%05d", ++next);
        }
        return candidate;
    }

    @Override
    @Transactional
    public Enseignant linkOrCreateEnseignant(Enseignant enseignant) {
        String mail = enseignant.getMail();
        if (hasNonBlankMail(mail)) {
            var existingOpt = enseignantRepository.findByMailIgnoreCase(mail);
            if (existingOpt.isPresent()) {
                return linkToExistingAccount(existingOpt.get(), enseignant, mail);
            }
        }
        return doCreateEnseignant(enseignant);
    }

    private boolean hasNonBlankMail(String mail) {
        return mail != null && !mail.isBlank();
    }

    private Enseignant linkToExistingAccount(Enseignant existing, Enseignant incoming, String mail) {
        String incomingUserId = incoming.getUserId();
        if (isLinkedToOtherAccount(existing, incomingUserId)) {
            throw new DuplicateEnseignantException(
                    "Un enseignant avec cet email est déjà lié à un autre compte : " + mail);
        }
        existing.setUserId(incomingUserId);
        applyNonNullFields(existing, incoming);
        return enseignantRepository.save(existing);
    }

    private boolean isLinkedToOtherAccount(Enseignant existing, String incomingUserId) {
        return existing.getUserId() != null && !existing.getUserId().isBlank()
                && !existing.getUserId().equals(incomingUserId);
    }

    private void applyNonNullFields(Enseignant existing, Enseignant incoming) {
        if (incoming.getNom() != null)             existing.setNom(incoming.getNom());
        if (incoming.getPrenom() != null)          existing.setPrenom(incoming.getPrenom());
        if (incoming.getTelephone() != null)       existing.setTelephone(incoming.getTelephone());
        if (incoming.getType() != null && !incoming.getType().isBlank())   existing.setType(incoming.getType());
        if (incoming.getEtat() != null && !incoming.getEtat().isBlank())   existing.setEtat(incoming.getEtat());
        if (incoming.getCup() != null && !incoming.getCup().isBlank())     existing.setCup(incoming.getCup());
        if (incoming.getChefDepartement() != null && !incoming.getChefDepartement().isBlank())
            existing.setChefDepartement(incoming.getChefDepartement());
        if (incoming.getGrade() != null)           existing.setGrade(incoming.getGrade());
        if (incoming.getSpecialite() != null)      existing.setSpecialite(incoming.getSpecialite());
        if (incoming.getUp() != null)              existing.setUp(resolveUp(incoming.getUp()));
        if (incoming.getDept() != null)            existing.setDept(resolveDept(incoming.getDept()));
    }

    /**
     * Recharge un {@link Up} managé depuis son id. Renvoie {@code null} si aucune
     * UP n'est demandée, lève {@link IllegalArgumentException} (→ 400) si l'id est
     * inconnu. Évite les références transients lors du save.
     */
    private Up resolveUp(Up up) {
        if (up == null || up.getId() == null || up.getId().isBlank()) {
            return null;
        }
        return upRepository.findById(up.getId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unité pédagogique introuvable : " + up.getId()));
    }

    /**
     * Recharge un {@link Dept} managé depuis son id. Mêmes règles que {@link #resolveUp}.
     */
    private Dept resolveDept(Dept dept) {
        if (dept == null || dept.getId() == null || dept.getId().isBlank()) {
            return null;
        }
        return deptRepository.findById(dept.getId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Département introuvable : " + dept.getId()));
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
            // Résolution managée (cf. createEnseignant) : éviter une référence transient.
            if (enseignant.getUp() != null)              e.setUp(resolveUp(enseignant.getUp()));
            if (enseignant.getDept() != null)            e.setDept(resolveDept(enseignant.getDept()));
            if (enseignant.getGrade() != null)           e.setGrade(enseignant.getGrade());
            if (enseignant.getSpecialite() != null)      e.setSpecialite(enseignant.getSpecialite());
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
        if (id == null) {
            throw new IllegalArgumentException("Enseignant introuvable avec l'id ou l'email : null");
        }
        String key = id.trim();
        return enseignantRepository.findById(id)
                .or(() -> enseignantRepository.findByMail(id))
                .or(() -> enseignantRepository.findByMailIgnoreCase(key))
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
        dto.setSpecialite(e.getSpecialite());
        dto.setTelephone(e.getTelephone());
        dto.setPhotoUrl(e.getPhotoUrl());
        dto.setUserId(e.getUserId());
        return dto;
    }
}
