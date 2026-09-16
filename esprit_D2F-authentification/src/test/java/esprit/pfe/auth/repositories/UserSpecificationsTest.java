package esprit.pfe.auth.repositories;

import esprit.pfe.auth.entities.ERole;
import esprit.pfe.auth.entities.User;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SuppressWarnings("unchecked")
@ExtendWith(MockitoExtension.class)
class UserSpecificationsTest {

    @Mock Root<User>           root;
    @Mock CriteriaQuery<?>     query;
    @Mock CriteriaBuilder      cb;
    @Mock Predicate            conjunction;
    @Mock Predicate            disjunction;
    @Mock Path<Object>         idPath;
    @Mock Path<Object>         disabledPath;
    @Mock Join<Object, Object> rolesJoin;
    @Mock Path<Object>         rolesNamePath;
    @Mock Predicate            equalPred;
    @Mock Predicate            orPred;
    @Mock Predicate            isFalsePred;
    @Mock Predicate            isNullPred;
    @Mock Predicate            isTruePred;
    @Mock Predicate            inPred;

    @BeforeEach
    void setUp() {
        lenient().when(cb.conjunction()).thenReturn(conjunction);
        lenient().when(cb.disjunction()).thenReturn(disjunction);
    }

    // ── byIds ─────────────────────────────────────────────────────────────────

    @Test
    void byIds_NullList_ReturnsConjunction() {
        Predicate result = UserSpecifications.byIds(null).toPredicate(root, query, cb);
        assertSame(conjunction, result);
    }

    @Test
    void byIds_EmptyList_ReturnsConjunction() {
        Predicate result = UserSpecifications.byIds(List.of()).toPredicate(root, query, cb);
        assertSame(conjunction, result);
    }

    @Test
    void byIds_WithIds_UsesInPredicate() {
        List<String> ids = List.of("u1", "u2");
        when(root.get("id")).thenReturn(idPath);
        when(idPath.in(ids)).thenReturn(inPred);

        Predicate result = UserSpecifications.byIds(ids).toPredicate(root, query, cb);
        assertSame(inPred, result);
    }

    // ── hasRole ───────────────────────────────────────────────────────────────

    @Test
    void hasRole_NullName_ReturnsConjunction() {
        assertSame(conjunction, UserSpecifications.hasRole(null).toPredicate(root, query, cb));
    }

    @Test
    void hasRole_BlankName_ReturnsConjunction() {
        assertSame(conjunction, UserSpecifications.hasRole("   ").toPredicate(root, query, cb));
    }

    @Test
    void hasRole_InvalidRole_ReturnsDisjunction() {
        assertSame(disjunction, UserSpecifications.hasRole("ROLE_INEXISTANT_XYZ").toPredicate(root, query, cb));
    }

    @Test
    void hasRole_ValidRole_WithQuery_ReturnsEqualPred() {
        when(root.join("roles")).thenReturn(rolesJoin);
        when(rolesJoin.get("name")).thenReturn(rolesNamePath);
        when(cb.equal(rolesNamePath, ERole.ENSEIGNANT)).thenReturn(equalPred);

        Predicate result = UserSpecifications.hasRole("ENSEIGNANT").toPredicate(root, query, cb);

        assertSame(equalPred, result);
        verify(query).distinct(true);
    }

    @Test
    void hasRole_ValidRole_NullQuery_ReturnsEqualPred() {
        when(root.join("roles")).thenReturn(rolesJoin);
        when(rolesJoin.get("name")).thenReturn(rolesNamePath);
        when(cb.equal(rolesNamePath, ERole.ADMIN)).thenReturn(equalPred);

        Predicate result = UserSpecifications.hasRole("ADMIN").toPredicate(root, null, cb);

        assertSame(equalPred, result);
    }

    @Test
    void hasRole_LowercaseInput_Normalizes() {
        when(root.join("roles")).thenReturn(rolesJoin);
        when(rolesJoin.get("name")).thenReturn(rolesNamePath);
        when(cb.equal(rolesNamePath, ERole.CUP)).thenReturn(equalPred);

        Predicate result = UserSpecifications.hasRole("cup").toPredicate(root, query, cb);

        assertSame(equalPred, result);
    }

    // ── isActive ──────────────────────────────────────────────────────────────

    @Test
    void isActive_NullParam_ReturnsConjunction() {
        assertSame(conjunction, UserSpecifications.isActive(null).toPredicate(root, query, cb));
    }

    @Test
    void isActive_True_ReturnsOrPredicate() {
        when(root.get("disabled")).thenReturn(disabledPath);
        when(cb.isNull(disabledPath)).thenReturn(isNullPred);
        when(cb.isFalse((Expression<Boolean>) (Object) disabledPath)).thenReturn(isFalsePred);
        when(cb.or(isNullPred, isFalsePred)).thenReturn(orPred);

        Predicate result = UserSpecifications.isActive(true).toPredicate(root, query, cb);
        assertSame(orPred, result);
    }

    @Test
    void isActive_False_ReturnsIsTruePredicate() {
        when(root.get("disabled")).thenReturn(disabledPath);
        when(cb.isTrue((Expression<Boolean>) (Object) disabledPath)).thenReturn(isTruePred);

        Predicate result = UserSpecifications.isActive(false).toPredicate(root, query, cb);
        assertSame(isTruePred, result);
    }

    // ── build ─────────────────────────────────────────────────────────────────

    @Test
    void build_NullParams_ReturnsNonNullSpec() {
        assertNotNull(UserSpecifications.build(null, null, null));
    }

    @Test
    void build_NullParams_ToPredicate_ExecutesAllSpecs() {
        // All 3 null-param specs return conjunction; the composition chain
        // short-circuits through null predicates and ultimately returns conjunction.
        Predicate result = UserSpecifications.build(null, null, null).toPredicate(root, query, cb);
        assertSame(conjunction, result);
    }

    @Test
    void build_WithAllValues_ToPredicate_ExecutesAllSpecs() {
        List<String> ids = List.of("u1");
        when(root.get("id")).thenReturn(idPath);
        when(idPath.in(ids)).thenReturn(inPred);
        when(root.join("roles")).thenReturn(rolesJoin);
        when(rolesJoin.get("name")).thenReturn(rolesNamePath);
        when(cb.equal(rolesNamePath, ERole.ADMIN)).thenReturn(equalPred);
        when(root.get("disabled")).thenReturn(disabledPath);
        when(cb.isNull(disabledPath)).thenReturn(isNullPred);
        when(cb.isFalse((Expression<Boolean>) (Object) disabledPath)).thenReturn(isFalsePred);
        when(cb.or(isNullPred, isFalsePred)).thenReturn(orPred);

        Specification<User> spec = UserSpecifications.build(ids, "ADMIN", true);
        assertNotNull(spec);
        // toPredicate must not throw; result depends on composition short-circuits
        Predicate result = spec.toPredicate(root, query, cb);
        assertNotNull(result);
        verify(root).join("roles");
        verify(query).distinct(true);
    }

    // ── utility class guard ───────────────────────────────────────────────────

    @Test
    void constructor_IsPrivateAndThrows() throws Exception {
        Constructor<UserSpecifications> ctor = UserSpecifications.class.getDeclaredConstructor();
        ctor.setAccessible(true);
        InvocationTargetException ex = assertThrows(InvocationTargetException.class, ctor::newInstance);
        assertInstanceOf(UnsupportedOperationException.class, ex.getCause());
    }
}
