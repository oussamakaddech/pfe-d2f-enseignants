package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.common.PageResponse;
import esprit.pfe.serviceformation.dto.AccountSummaryDTO;
import esprit.pfe.serviceformation.dto.AccountSummaryRequest;
import esprit.pfe.serviceformation.dto.AdvancedFilterRequest;
import esprit.pfe.serviceformation.dto.DeptDTO;
import esprit.pfe.serviceformation.dto.UnifiedProfileDTO;
import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.feign.AuthAccountClient;
import esprit.pfe.serviceformation.repositories.DeptRepository;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service de la page de gestion unifiée (comptes + enseignants).
 * Base = enseignants (service formation), enrichis par les comptes (rôle/statut
 * actif) via Feign vers auth. Applique le contrôle d'accès row-level :
 * CHEF_DEPARTEMENT est limité à son propre département.
 */
@Service
@Slf4j
public class UnifiedProfileService {

    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 200;
    private static final int MAX_EXPORT = 10_000;
    private static final String DEFAULT_SORT = "nom";
    private static final String NO_DEPARTMENT_SENTINEL = "__NO_DEPARTMENT__";
    private static final Set<String> SORTABLE =
            Set.of("nom", "prenom", "mail", "grade", "dateRecrutement", "etat", "createdAt", "id");

    private final EnseignantRepository enseignantRepository;
    private final DeptRepository departementRepository;
    private final AuthAccountClient authAccountClient;

    public UnifiedProfileService(EnseignantRepository enseignantRepository,
                                 DeptRepository departementRepository,
                                 AuthAccountClient authAccountClient) {
        this.enseignantRepository = enseignantRepository;
        this.departementRepository = departementRepository;
        this.authAccountClient = authAccountClient;
    }

    // ── Liste paginée + filtrée ─────────────────────────────────────────
    @Transactional(readOnly = true)
    public PageResponse<UnifiedProfileDTO> getUnifiedProfiles(AdvancedFilterRequest filter, CurrentUser current) {
        AdvancedFilterRequest f = (filter != null) ? filter : new AdvancedFilterRequest();
        Pageable pageable = buildPageable(f);

        // Pré-filtre cross-service (rôle/statut compte) → ids de comptes correspondants.
        List<String> accountUserIds = resolveAccountUserIdFilter(f);
        if (accountUserIds != null && accountUserIds.isEmpty()) {
            return PageResponse.of(List.of(), Page.empty(pageable));
        }

        Collection<String> allowedDeptIds = resolveAllowedDepartements(current);
        Specification<Enseignant> spec = UnifiedProfileSpecifications.build(f, accountUserIds, allowedDeptIds);

        Page<Enseignant> page = enseignantRepository.findAll(spec, pageable);
        List<UnifiedProfileDTO> content = enrichAndMap(page.getContent());
        return PageResponse.of(content, page);
    }

    // ── Référentiels pour les filtres ───────────────────────────────────
    @Transactional(readOnly = true)
    public List<DeptDTO> getDepartements(CurrentUser current) {
        if (current.isDepartmentScoped()) {
            return departementRepository.findAllById(resolveChefDeptIds(current)).stream()
                    .map(this::toDeptDto).toList();
        }
        return departementRepository.findAll().stream().map(this::toDeptDto).toList();
    }

    @Transactional(readOnly = true)
    public List<String> getGrades() {
        return enseignantRepository.findDistinctGrades();
    }

    // ── Export CSV des résultats filtrés (UTF-8 + BOM Excel) ────────────
    @Transactional(readOnly = true)
    public byte[] exportCsv(AdvancedFilterRequest filter, CurrentUser current) {
        AdvancedFilterRequest f = (filter != null) ? filter : new AdvancedFilterRequest();
        List<String> accountUserIds = resolveAccountUserIdFilter(f);
        List<Enseignant> rows;
        if (accountUserIds != null && accountUserIds.isEmpty()) {
            rows = List.of();
        } else {
            Collection<String> allowedDeptIds = resolveAllowedDepartements(current);
            Specification<Enseignant> spec = UnifiedProfileSpecifications.build(f, accountUserIds, allowedDeptIds);
            Sort sort = buildPageable(f).getSort();
            rows = enseignantRepository.findAll(spec, sort);
            if (rows.size() > MAX_EXPORT) {
                rows = rows.subList(0, MAX_EXPORT);
            }
        }
        List<UnifiedProfileDTO> dtos = enrichAndMap(rows);
        return buildCsv(dtos);
    }

    // ════════════════════════════════════════════════════════════════════
    //  Internes
    // ════════════════════════════════════════════════════════════════════

    private Pageable buildPageable(AdvancedFilterRequest f) {
        int page = (f.getPage() != null && f.getPage() >= 0) ? f.getPage() : 0;
        int size = (f.getSize() != null && f.getSize() > 0) ? Math.min(f.getSize(), MAX_SIZE) : DEFAULT_SIZE;
        String sortBy = (f.getSortBy() != null && SORTABLE.contains(f.getSortBy())) ? f.getSortBy() : DEFAULT_SORT;
        Sort.Direction dir = "DESC".equalsIgnoreCase(f.getSortDirection()) ? Sort.Direction.DESC : Sort.Direction.ASC;
        return PageRequest.of(page, size, Sort.by(dir, sortBy));
    }

    /**
     * Si un filtre rôle/statut compte est demandé, interroge auth pour obtenir les
     * ids de comptes correspondants (la pagination reste exacte côté enseignants).
     * Renvoie {@code null} si aucun filtre compte (= pas de contrainte).
     */
    @SuppressWarnings("java:S1168")
    private List<String> resolveAccountUserIdFilter(AdvancedFilterRequest f) {
        boolean accountFilter = (f.getRole() != null && !f.getRole().isBlank()) || f.getIsActive() != null;
        if (!accountFilter) {
            return null;
        }
        List<AccountSummaryDTO> matches = authAccountClient.getAccountSummaries(
                AccountSummaryRequest.builder().role(f.getRole()).active(f.getIsActive()).build());
        return matches.stream().map(AccountSummaryDTO::getUserId).filter(Objects::nonNull).distinct().toList();
    }

    /** Départements autorisés (null = pas de restriction ; sentinel = aucun accès). */
    @SuppressWarnings("java:S1168")
    private Collection<String> resolveAllowedDepartements(CurrentUser current) {
        if (current == null || !current.isDepartmentScoped()) {
            return null;
        }
        return resolveChefDeptIds(current);
    }

    private List<String> resolveChefDeptIds(CurrentUser current) {
        Optional<Enseignant> fiche = Optional.empty();
        if (current.userId() != null && !current.userId().isBlank()) {
            fiche = enseignantRepository.findByUserId(current.userId());
        }
        if (fiche.isEmpty() && current.email() != null && !current.email().isBlank()) {
            fiche = enseignantRepository.findByMailIgnoreCase(current.email());
        }
        String deptId = fiche.map(e -> e.getDept() != null ? e.getDept().getId() : null).orElse(null);
        // Deny-by-default : un chef sans département résolu ne voit aucun profil.
        return (deptId != null) ? List.of(deptId) : List.of(NO_DEPARTMENT_SENTINEL);
    }

    private List<UnifiedProfileDTO> enrichAndMap(List<Enseignant> enseignants) {
        Map<String, AccountSummaryDTO> accounts = fetchAccounts(enseignants);
        return enseignants.stream().map(e -> toDto(e, accounts.get(e.getUserId()))).toList();
    }

    private Map<String, AccountSummaryDTO> fetchAccounts(List<Enseignant> enseignants) {
        List<String> ids = enseignants.stream()
                .map(Enseignant::getUserId).filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        try {
            List<AccountSummaryDTO> summaries = authAccountClient.getAccountSummaries(
                    AccountSummaryRequest.builder().userIds(ids).build());
            return summaries.stream()
                    .filter(s -> s.getUserId() != null)
                    .collect(Collectors.toMap(AccountSummaryDTO::getUserId, Function.identity(), (a, b) -> a));
        } catch (RuntimeException ex) {
            log.warn("Enrichissement comptes indisponible : {}", ex.getMessage());
            return Map.of();
        }
    }

    private UnifiedProfileDTO toDto(Enseignant e, AccountSummaryDTO account) {
        return UnifiedProfileDTO.builder()
                .id(e.getId())
                .matricule(e.getId())
                .userId(e.getUserId())
                .nom(e.getNom())
                .prenom(e.getPrenom())
                .email(e.getMail())
                .role(account != null ? account.getRole() : null)
                .departementId(e.getDept() != null ? e.getDept().getId() : null)
                .departement(e.getDept() != null ? e.getDept().getLibelle() : null)
                .upId(e.getUp() != null ? e.getUp().getId() : null)
                .up(e.getUp() != null ? e.getUp().getLibelle() : null)
                .grade(e.getGrade())
                .specialite(e.getSpecialite())
                .telephone(e.getTelephone())
                .photoUrl(e.getPhotoUrl())
                .type(e.getType())
                .statut(e.getEtat())
                .cup(e.getCup())
                .chefDepartement(e.getChefDepartement())
                .isActive(account != null ? account.isActive() : null)
                .accountLinked(account != null)
                .dateRecrutement(e.getDateRecrutement())
                .dossierStatus(e.getDossierStatus())
                .dossierLastUpdate(e.getDossierLastUpdate())
                .dossierNotes(e.getDossierNotes())
                .createdAt(e.getCreatedAt())
                .build();
    }

    private DeptDTO toDeptDto(Dept dept) {
        DeptDTO dto = new DeptDTO();
        dto.setId(dept.getId());
        dto.setLibelle(dept.getLibelle());
        return dto;
    }

    private byte[] buildCsv(List<UnifiedProfileDTO> profiles) {
        StringBuilder sb = new StringBuilder("\uFEFF"); // BOM → ouverture correcte sous Excel
        sb.append("Matricule;Nom;Prenom;Email;Role;Departement;UP;Grade;Specialite;Type;Statut;Actif;DateRecrutement;StatutDossier\n");
        for (UnifiedProfileDTO p : profiles) {
            String activeStr = resolveActiveLabel(p.getIsActive());
            String dateStr = p.getDateRecrutement() == null ? "" : p.getDateRecrutement().toString();
            sb.append(csv(p.getMatricule())).append(';')
              .append(csv(p.getNom())).append(';')
              .append(csv(p.getPrenom())).append(';')
              .append(csv(p.getEmail())).append(';')
              .append(csv(p.getDepartement())).append(';')
              .append(csv(p.getUp())).append(';')
              .append(csv(p.getGrade())).append(';')
              .append(csv(p.getSpecialite())).append(';')
              .append(csv(p.getType())).append(';')
              .append(csv(p.getStatut())).append(';')
              .append(csv(activeStr)).append(';')
              .append(csv(dateStr)).append(';')
              .append(csv(p.getDossierStatus())).append('\n');
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String resolveActiveLabel(Boolean isActive) {
        if (isActive == null) {
            return "";
        }
        return Boolean.TRUE.equals(isActive) ? "Oui" : "Non";
    }

    private String csv(String value) {
        if (value == null) {
            return "";
        }
        String v = value.replace("\"", "\"\"");
        if (v.contains(";") || v.contains("\n") || v.contains("\"")) {
            return "\"" + v + "\"";
        }
        return v;
    }
}
