package tn.esprit.d2f.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.d2f.entity.ReviewerScope;
import tn.esprit.d2f.entity.enumerations.CreatorRole;
import tn.esprit.d2f.exception.ResourceNotFoundException;
import tn.esprit.d2f.repository.ReviewerScopeRepository;

import java.util.Collection;
import java.util.List;

/**
 * Résolution et administration des périmètres validateurs.
 *
 * <p>Le périmètre (UP du CUP, département du chef) est la source d'autorité
 * côté serveur pour le filtrage « appartient à lui » : il est résolu depuis
 * le username du JWT via la table {@code reviewer_scope}, jamais depuis les
 * paramètres du frontend. Seul l'administrateur gère les lignes.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewerScopeService {

    private static final String ROLE_ADMIN = "ROLE_ADMIN";
    private static final String ROLE_CUP = "ROLE_CUP";
    private static final String ROLE_CHEF_DEP = "ROLE_CHEF_DEPARTEMENT";
    private static final String ROLE_ENSEIGNANT = "ROLE_ENSEIGNANT";
    private static final String ROLE_ANIMATEUR = "ROLE_ANIMATEUR";

    private final ReviewerScopeRepository reviewerScopeRepository;

    /** Périmètre résolu pour l'utilisateur connecté. */
    public record ResolvedScope(
            String username,
            String userId,
            CreatorRole actorRole,
            String upCode,
            String departmentCode,
            boolean global) {
    }

    /**
     * Résout le rôle fonctionnel prioritaire de l'appelant.
     * Priorité : ADMIN &gt; CUP &gt; CHEF_DEPARTEMENT &gt; ENSEIGNANT (ANIMATEUR assimilé).
     */
    public CreatorRole resolveActorRole(Collection<? extends GrantedAuthority> authorities) {
        if (hasRole(authorities, ROLE_ADMIN)) return CreatorRole.ADMIN;
        if (hasRole(authorities, ROLE_CUP)) return CreatorRole.CUP;
        if (hasRole(authorities, ROLE_CHEF_DEP)) return CreatorRole.CHEF_DEPARTEMENT;
        if (hasRole(authorities, ROLE_ENSEIGNANT) || hasRole(authorities, ROLE_ANIMATEUR)) {
            return CreatorRole.ENSEIGNANT;
        }
        throw new AccessDeniedException("Rôle non reconnu pour le workflow des besoins de formation.");
    }

    /** Résout le périmètre complet de l'utilisateur connecté. */
    @Transactional(readOnly = true)
    public ResolvedScope resolveCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null) {
            throw new AccessDeniedException("Authentification requise.");
        }
        CreatorRole actorRole = resolveActorRole(auth.getAuthorities());
        String userId = extractUserId(auth);
        if (actorRole == CreatorRole.ADMIN) {
            return new ResolvedScope(auth.getName(), userId, actorRole, null, null, true);
        }
        ReviewerScope scope = requireConfiguredScope(auth.getName(), actorRole);
        validateScopeFields(scope, actorRole);
        return new ResolvedScope(auth.getName(), userId, actorRole,
                scope.getUpCode(), scope.getDepartmentCode(), false);
    }

    /** Charge le périmètre et vérifie la cohérence du rôle JWT / table. */
    private ReviewerScope requireConfiguredScope(String username, CreatorRole actorRole) {
        ReviewerScope scope = reviewerScopeRepository.findById(username)
                .orElseThrow(() -> new AccessDeniedException(
                        "Périmètre non configuré pour '" + username
                        + "' : demandez à l'administrateur d'assigner votre UP / département."));
        String expectedRole = switch (actorRole) {
            case CUP -> ROLE_CUP;
            case CHEF_DEPARTEMENT -> ROLE_CHEF_DEP;
            case ENSEIGNANT -> ROLE_ENSEIGNANT;
            case ADMIN -> null;
        };
        if (!expectedRole.equals(scope.getRole())) {
            throw new AccessDeniedException(
                "Le rôle du périmètre ne correspond pas au rôle JWT pour '" + username + "'.");
        }
        return scope;
    }

    /** Vérifie la présence des champs obligatoires selon le rôle. */
    private void validateScopeFields(ReviewerScope scope, CreatorRole actorRole) {
        if (actorRole == CreatorRole.ENSEIGNANT
                && (scope.getUpCode() == null || scope.getUpCode().isBlank()
                    || scope.getDepartmentCode() == null || scope.getDepartmentCode().isBlank())) {
            throw new AccessDeniedException(
                "Périmètre incomplet : une UP et un département sont obligatoires pour ce compte enseignant.");
        }
        if (actorRole == CreatorRole.CUP
                && (scope.getUpCode() == null || scope.getUpCode().isBlank())) {
            throw new AccessDeniedException(
                    "Périmètre incomplet : aucune UP assignée à ce compte CUP.");
        }
        if (actorRole == CreatorRole.CHEF_DEPARTEMENT
                && (scope.getDepartmentCode() == null || scope.getDepartmentCode().isBlank())) {
            throw new AccessDeniedException(
                    "Périmètre incomplet : aucun département assigné à ce compte.");
        }
    }

    /** Vérifie que le besoin appartient au périmètre du validateur (403 sinon). */
    public void ensureInScope(ResolvedScope scope, String besoinUp, String besoinDepartement, Long besoinId) {
        if (scope.global()) return;
        if (scope.actorRole() == CreatorRole.CUP) {
            if (besoinUp == null || !besoinUp.equals(scope.upCode())) {
                throw new AccessDeniedException("Périmètre interdit : ce besoin n'appartient pas à votre UP ("
                        + scope.upCode() + "). Besoin n°" + besoinId + ".");
            }
            return;
        }
        if (scope.actorRole() == CreatorRole.CHEF_DEPARTEMENT
                && (besoinDepartement == null || !besoinDepartement.equals(scope.departmentCode()))) {
            throw new AccessDeniedException("Périmètre interdit : ce besoin n'appartient pas à votre département ("
                    + scope.departmentCode() + "). Besoin n°" + besoinId + ".");
        }
    }

    // ── Administration (ADMIN uniquement — contrôle via @PreAuthorize) ──────

    @Transactional(readOnly = true)
    public Page<ReviewerScope> listScopes(Pageable pageable) {
        return reviewerScopeRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public List<ReviewerScope> listAllScopes() {
        return reviewerScopeRepository.findAll();
    }

    @Transactional(readOnly = true)
    public ReviewerScope getScope(String username) {
        return reviewerScopeRepository.findById(username)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Périmètre introuvable pour l'utilisateur '" + username + "'."));
    }

    @Transactional
    public ReviewerScope upsertScope(String username, String role, String upCode, String departmentCode) {
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("Le username est obligatoire.");
        }
        if (!ROLE_CUP.equals(role) && !ROLE_CHEF_DEP.equals(role) && !ROLE_ENSEIGNANT.equals(role)) {
            throw new IllegalArgumentException("Le rôle du périmètre doit être CUP, CHEF_DEPARTEMENT ou ENSEIGNANT.");
        }
        if ((ROLE_CUP.equals(role) || ROLE_ENSEIGNANT.equals(role))
                && (upCode == null || upCode.isBlank())) {
            throw new IllegalArgumentException("L'UP est obligatoire pour ce périmètre.");
        }
        if ((ROLE_CHEF_DEP.equals(role) || ROLE_ENSEIGNANT.equals(role))
                && (departmentCode == null || departmentCode.isBlank())) {
            throw new IllegalArgumentException("Le département est obligatoire pour ce périmètre.");
        }
        ReviewerScope scope = reviewerScopeRepository.findById(username)
                .orElse(ReviewerScope.builder().username(username).build());
        scope.setRole(role);
        scope.setUpCode(upCode);
        scope.setDepartmentCode(departmentCode);
        ReviewerScope saved = reviewerScopeRepository.save(scope);
        log.info("Périmètre validateur assigné : {} -> {} / {}", username, upCode, departmentCode);
        return saved;
    }

    @Transactional
    public void deleteScope(String username) {
        if (!reviewerScopeRepository.existsById(username)) {
            throw new ResourceNotFoundException(
                    "Périmètre introuvable pour l'utilisateur '" + username + "'.");
        }
        reviewerScopeRepository.deleteById(username);
        log.info("Périmètre validateur supprimé : {}", username);
    }

    private boolean hasRole(Collection<? extends GrantedAuthority> authorities, String role) {
        return authorities.stream().anyMatch(a -> role.equals(a.getAuthority()));
    }

    private String extractUserId(Authentication auth) {
        try {
            Object principal = auth.getPrincipal();
            if (principal instanceof org.springframework.security.oauth2.jwt.Jwt jwt) {
                String userId = jwt.getClaimAsString("userId");
                return userId != null ? userId : auth.getName();
            }
        } catch (Exception e) {
            log.debug("Claim userId illisible, repli sur le username : {}", e.getMessage());
        }
        return auth.getName();
    }
}
