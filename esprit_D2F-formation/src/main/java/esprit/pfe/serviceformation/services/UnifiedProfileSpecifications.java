package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.AdvancedFilterRequest;
import esprit.pfe.serviceformation.entities.Enseignant;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * Specifications JPA dynamiques pour la recherche d'enseignants dans la page
 * unifiée. Tous les critères sont optionnels et combinés en ET logique.
 * Le soft-delete (@SQLRestriction deleted_at IS NULL) est conservé par Hibernate.
 */
public final class UnifiedProfileSpecifications {

    private UnifiedProfileSpecifications() {
        throw new UnsupportedOperationException("Utility class");
    }

    /** Recherche libre insensible à la casse sur nom, prénom, mail, matricule (id). */
    public static Specification<Enseignant> search(String term) {
        return (root, query, cb) -> {
            if (term == null || term.isBlank()) {
                return cb.conjunction();
            }
            String like = "%" + term.trim().toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("nom")), like),
                    cb.like(cb.lower(root.get("prenom")), like),
                    cb.like(cb.lower(root.get("mail")), like),
                    cb.like(cb.lower(root.get("id")), like));
        };
    }

    public static Specification<Enseignant> departement(String departementId) {
        return (root, query, cb) -> (departementId == null || departementId.isBlank())
                ? cb.conjunction()
                : cb.equal(root.get("dept").get("id"), departementId);
    }

    public static Specification<Enseignant> up(String upId) {
        return (root, query, cb) -> (upId == null || upId.isBlank())
                ? cb.conjunction()
                : cb.equal(root.get("up").get("id"), upId);
    }

    public static Specification<Enseignant> grade(String grade) {
        return (root, query, cb) -> (grade == null || grade.isBlank())
                ? cb.conjunction()
                : cb.equal(root.get("grade"), grade);
    }

    public static Specification<Enseignant> statut(String statut) {
        return (root, query, cb) -> (statut == null || statut.isBlank())
                ? cb.conjunction()
                : cb.equal(root.get("etat"), statut);
    }

    public static Specification<Enseignant> dossierStatus(String dossierStatus) {
        return (root, query, cb) -> (dossierStatus == null || dossierStatus.isBlank())
                ? cb.conjunction()
                : cb.equal(root.get("dossierStatus"), dossierStatus);
    }

    public static Specification<Enseignant> recruitedBetween(java.time.LocalDate from, java.time.LocalDate to) {
        return (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (from != null) {
                ps.add(cb.greaterThanOrEqualTo(root.get("dateRecrutement"), from));
            }
            if (to != null) {
                ps.add(cb.lessThanOrEqualTo(root.get("dateRecrutement"), to));
            }
            return ps.isEmpty() ? cb.conjunction() : cb.and(ps.toArray(new Predicate[0]));
        };
    }

    /** Contrainte par identifiants de compte (cross-filtre rôle/statut résolu via auth). */
    public static Specification<Enseignant> userIdIn(Collection<String> userIds) {
        return (root, query, cb) -> (userIds == null || userIds.isEmpty())
                ? cb.conjunction()
                : root.get("userId").in(userIds);
    }

    /** Restriction row-level : limite aux départements autorisés (CHEF_DEPARTEMENT). */
    public static Specification<Enseignant> restrictToDepartements(Collection<String> allowedDeptIds) {
        return (root, query, cb) -> (allowedDeptIds == null || allowedDeptIds.isEmpty())
                ? cb.conjunction()
                : root.get("dept").get("id").in(allowedDeptIds);
    }

    /**
     * Construit la spécification complète à partir des filtres + contraintes RBAC.
     *
     * @param filter            critères utilisateur
     * @param accountUserIds    ids de compte issus du pré-filtre rôle/statut (null = pas de cross-filtre)
     * @param allowedDeptIds    départements autorisés (null/empty = pas de restriction row-level)
     */
    public static Specification<Enseignant> build(AdvancedFilterRequest filter,
                                                  Collection<String> accountUserIds,
                                                  Collection<String> allowedDeptIds) {
        return Specification.allOf(
                search(filter.getSearch()),
                departement(filter.getDepartementId()),
                up(filter.getUpId()),
                grade(filter.getGrade()),
                statut(filter.getStatut()),
                dossierStatus(filter.getDossierStatus()),
                recruitedBetween(filter.getRecruitedFrom(), filter.getRecruitedTo()),
                userIdIn(accountUserIds),
                restrictToDepartements(allowedDeptIds));
    }
}
