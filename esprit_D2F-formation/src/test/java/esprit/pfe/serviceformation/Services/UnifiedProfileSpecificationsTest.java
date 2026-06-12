package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.AdvancedFilterRequest;
import esprit.pfe.serviceformation.entities.Enseignant;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UnifiedProfileSpecificationsTest {

    @Mock private Root<Enseignant> root;
    @Mock private CriteriaQuery<?> query;
    @Mock private CriteriaBuilder cb;
    @Mock private Predicate predicate;
    @Mock private Path<Object> path;

    @Test
    void searchNullTermReturnsConjunction() {
        Specification<Enseignant> spec = UnifiedProfileSpecifications.search(null);
        spec.toPredicate(root, query, cb);
        verify(cb).conjunction();
    }

    @Test
    void searchBlankTermReturnsConjunction() {
        Specification<Enseignant> spec = UnifiedProfileSpecifications.search("   ");
        spec.toPredicate(root, query, cb);
        verify(cb).conjunction();
    }

    @Test
    void searchWithTermBuildsOrPredicate() {
        when(cb.or(any(Predicate[].class))).thenReturn(predicate);

        Specification<Enseignant> spec = UnifiedProfileSpecifications.search("ali");
        spec.toPredicate(root, query, cb);

        verify(cb).or(any(Predicate[].class));
    }

    @Test
    void departementNullReturnsConjunction() {
        UnifiedProfileSpecifications.departement(null).toPredicate(root, query, cb);
        verify(cb).conjunction();
    }

    @Test
    void departementBlankReturnsConjunction() {
        UnifiedProfileSpecifications.departement("").toPredicate(root, query, cb);
        verify(cb).conjunction();
    }

    @Test
    void departementWithValueBuildsEqual() {
        when(root.get("dept")).thenReturn(path);
        when(path.get("id")).thenReturn(path);
        when(cb.equal(path, "dept123")).thenReturn(predicate);

        UnifiedProfileSpecifications.departement("dept123").toPredicate(root, query, cb);

        verify(cb).equal(path, "dept123");
    }

    @Test
    void upNullReturnsConjunction() {
        UnifiedProfileSpecifications.up(null).toPredicate(root, query, cb);
        verify(cb).conjunction();
    }

    @Test
    void upWithValueBuildsEqual() {
        when(root.get("up")).thenReturn(path);
        when(path.get("id")).thenReturn(path);
        when(cb.equal(path, "up456")).thenReturn(predicate);

        UnifiedProfileSpecifications.up("up456").toPredicate(root, query, cb);
        verify(cb).equal(path, "up456");
    }

    @Test
    void gradeNullReturnsConjunction() {
        UnifiedProfileSpecifications.grade(null).toPredicate(root, query, cb);
        verify(cb).conjunction();
    }

    @Test
    void gradeWithValueBuildsEqual() {
        when(root.get("grade")).thenReturn(path);
        when(cb.equal(path, "MCF")).thenReturn(predicate);

        UnifiedProfileSpecifications.grade("MCF").toPredicate(root, query, cb);
        verify(cb).equal(path, "MCF");
    }

    @Test
    void statutNullReturnsConjunction() {
        UnifiedProfileSpecifications.statut(null).toPredicate(root, query, cb);
        verify(cb).conjunction();
    }

    @Test
    void statutWithValueBuildsEqual() {
        when(root.get("etat")).thenReturn(path);
        when(cb.equal(path, "ACTIF")).thenReturn(predicate);

        UnifiedProfileSpecifications.statut("ACTIF").toPredicate(root, query, cb);
        verify(cb).equal(path, "ACTIF");
    }

    @Test
    void dossierStatusNullReturnsConjunction() {
        UnifiedProfileSpecifications.dossierStatus(null).toPredicate(root, query, cb);
        verify(cb).conjunction();
    }

    @Test
    void dossierStatusWithValueBuildsEqual() {
        when(root.get("dossierStatus")).thenReturn(path);
        when(cb.equal(path, "COMPLET")).thenReturn(predicate);

        UnifiedProfileSpecifications.dossierStatus("COMPLET").toPredicate(root, query, cb);
        verify(cb).equal(path, "COMPLET");
    }

    @Test
    void recruitedBetweenBothNull() {
        UnifiedProfileSpecifications.recruitedBetween(null, null).toPredicate(root, query, cb);
        verify(cb).conjunction();
    }

    @Test
    void recruitedBetweenFromOnly() {
        when(cb.and(any(Predicate[].class))).thenReturn(predicate);

        UnifiedProfileSpecifications.recruitedBetween(LocalDate.of(2023, 1, 1), null).toPredicate(root, query, cb);

        verify(cb).and(any(Predicate[].class));
    }

    @Test
    void recruitedBetweenToOnly() {
        when(cb.and(any(Predicate[].class))).thenReturn(predicate);

        UnifiedProfileSpecifications.recruitedBetween(null, LocalDate.of(2024, 12, 31)).toPredicate(root, query, cb);

        verify(cb).and(any(Predicate[].class));
    }

    @Test
    void recruitedBetweenBoth() {
        when(cb.and(any(Predicate[].class))).thenReturn(predicate);

        UnifiedProfileSpecifications.recruitedBetween(
                LocalDate.of(2023, 1, 1), LocalDate.of(2024, 12, 31)).toPredicate(root, query, cb);

        verify(cb).and(any(Predicate[].class));
    }

    @Test
    void userIdInNullCollection() {
        UnifiedProfileSpecifications.userIdIn(null).toPredicate(root, query, cb);
        verify(cb).conjunction();
    }

    @Test
    void userIdInEmptyCollection() {
        UnifiedProfileSpecifications.userIdIn(List.of()).toPredicate(root, query, cb);
        verify(cb).conjunction();
    }

    @Test
    void userIdInWithValues() {
        when(root.get("userId")).thenReturn(path);
        when(path.in(Set.of("u1", "u2"))).thenReturn(predicate);

        UnifiedProfileSpecifications.userIdIn(Set.of("u1", "u2")).toPredicate(root, query, cb);

        verify(path).in(Set.of("u1", "u2"));
    }

    @Test
    void restrictToDepartementsNull() {
        UnifiedProfileSpecifications.restrictToDepartements(null).toPredicate(root, query, cb);
        verify(cb).conjunction();
    }

    @Test
    void restrictToDepartementsWithValues() {
        when(root.get("dept")).thenReturn(path);
        when(path.get("id")).thenReturn(path);
        when(path.in(Set.of("d1", "d2"))).thenReturn(predicate);

        UnifiedProfileSpecifications.restrictToDepartements(Set.of("d1", "d2")).toPredicate(root, query, cb);

        verify(path).in(Set.of("d1", "d2"));
    }

    @Test
    void buildCombinesAllSpecifications() {
        AdvancedFilterRequest filter = new AdvancedFilterRequest();
        filter.setSearch("ali");
        filter.setDepartementId("dept1");
        filter.setUpId("up1");
        filter.setGrade("MCF");
        filter.setStatut("ACTIF");
        filter.setDossierStatus("COMPLET");
        filter.setRecruitedFrom(LocalDate.of(2020, 1, 1));
        filter.setRecruitedTo(LocalDate.of(2024, 12, 31));

        Specification<Enseignant> spec = UnifiedProfileSpecifications.build(filter, Set.of("u1", "u2"), Set.of("d1", "d2"));

        assertThat(spec).isNotNull();
    }
}
