package esprit.pfe.auth.repositories;

import esprit.pfe.auth.entities.ERole;
import esprit.pfe.auth.entities.User;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * Specifications JPA dynamiques pour la recherche de comptes (page unifiée).
 * Le soft-delete (@SQLRestriction deleted_at IS NULL) reste appliqué par Hibernate.
 */
public final class UserSpecifications {

    private UserSpecifications() {
        throw new UnsupportedOperationException("Utility class");
    }

    public static Specification<User> byIds(List<String> userIds) {
        return (root, query, cb) ->
                (userIds == null || userIds.isEmpty()) ? cb.conjunction() : root.get("id").in(userIds);
    }

    public static Specification<User> hasRole(String roleName) {
        return (root, query, cb) -> {
            if (roleName == null || roleName.isBlank()) {
                return cb.conjunction();
            }
            ERole target;
            try {
                target = ERole.valueOf(roleName.trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                // Rôle inconnu → aucun résultat (filtre cohérent, pas d'erreur 500)
                return cb.disjunction();
            }
            if (query != null) {
                query.distinct(true);
            }
            Join<Object, Object> roles = root.join("roles");
            return cb.equal(roles.get("name"), target);
        };
    }

    public static Specification<User> isActive(Boolean active) {
        return (root, query, cb) -> {
            if (active == null) {
                return cb.conjunction();
            }
            // active=true → disabled IS NULL OR disabled = false
            if (Boolean.TRUE.equals(active)) {
                return cb.or(cb.isNull(root.get("disabled")), cb.isFalse(root.get("disabled")));
            }
            return cb.isTrue(root.get("disabled"));
        };
    }

    /** Combine tous les critères optionnels en ET logique. */
    public static Specification<User> build(List<String> userIds, String role, Boolean active) {
        List<Specification<User>> specs = new ArrayList<>();
        specs.add(byIds(userIds));
        specs.add(hasRole(role));
        specs.add(isActive(active));
        Specification<User> result = Specification.where(null);
        for (Specification<User> s : specs) {
            result = result.and(s);
        }
        return result;
    }
}
