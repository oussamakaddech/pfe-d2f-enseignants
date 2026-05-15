package esprit.d2f.common.security;

import org.junit.jupiter.api.Test;
import org.springframework.expression.Expression;
import org.springframework.expression.spel.standard.SpelExpressionParser;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Validates the integrity of the central authorization matrix.
 *
 * Goals :
 *  - every public String constant must be a syntactically valid SpEL expression
 *  - no constant may be empty or null
 *  - every role referenced must follow the ROLE_* convention
 *  - the matrix may not be instantiated (utility class)
 *  - critical permissions cover the expected role sets (snapshot regression)
 */
class AuthorizationMatrixTest {

    private final SpelExpressionParser parser = new SpelExpressionParser();

    private static List<Field> allConstantFields() {
        List<Field> out = new ArrayList<>();
        for (Field f : AuthorizationMatrix.class.getDeclaredFields()) {
            int mod = f.getModifiers();
            if (Modifier.isPublic(mod) && Modifier.isStatic(mod) && Modifier.isFinal(mod)
                    && f.getType() == String.class) {
                out.add(f);
            }
        }
        return out;
    }

    @Test
    void utility_class_cannot_be_instantiated() throws Exception {
        var ctor = AuthorizationMatrix.class.getDeclaredConstructor();
        ctor.setAccessible(true);
        var exc = assertThrows(java.lang.reflect.InvocationTargetException.class, ctor::newInstance);
        assertTrue(exc.getCause() instanceof UnsupportedOperationException);
    }

    @Test
    void all_constants_are_non_blank() throws Exception {
        for (Field f : allConstantFields()) {
            String value = (String) f.get(null);
            assertNotNull(value, "Constant " + f.getName() + " is null");
            assertFalse(value.isBlank(), "Constant " + f.getName() + " is blank");
        }
    }

    @Test
    void all_constants_parse_as_valid_SpEL() throws Exception {
        for (Field f : allConstantFields()) {
            String expr = (String) f.get(null);
            try {
                Expression parsed = parser.parseExpression(expr);
                assertNotNull(parsed, "Parser returned null for " + f.getName());
            } catch (Exception e) {
                fail("Invalid SpEL for " + f.getName() + " = " + expr + " : " + e.getMessage());
            }
        }
    }

    @Test
    void role_names_follow_ROLE_prefix_convention() throws Exception {
        for (Field f : allConstantFields()) {
            String expr = (String) f.get(null);
            // Extract every literal between single quotes and ensure ROLE_* convention.
            int i = 0;
            while ((i = expr.indexOf('\'', i)) >= 0) {
                int end = expr.indexOf('\'', i + 1);
                if (end < 0) break;
                String literal = expr.substring(i + 1, end);
                i = end + 1;
                if (literal.toUpperCase().startsWith("ROLE_")) {
                    assertTrue(literal.equals(literal.toUpperCase()),
                            "Role literal must be UPPER_CASE in " + f.getName() + " : " + literal);
                }
            }
        }
    }

    @Test
    void public_access_is_permitAll() {
        assertEquals("permitAll()", AuthorizationMatrix.PUBLIC_ACCESS);
    }

    @Test
    void competence_destructive_ops_require_admin() {
        assertEquals("hasAnyRole('ROLE_ADMIN')", AuthorizationMatrix.COMPETENCE_CREATE);
        assertEquals("hasAnyRole('ROLE_ADMIN')", AuthorizationMatrix.COMPETENCE_UPDATE);
        assertEquals("hasAnyRole('ROLE_ADMIN')", AuthorizationMatrix.COMPETENCE_DELETE);
    }

    @Test
    void account_destructive_ops_require_admin() {
        for (String expr : List.of(
                AuthorizationMatrix.ACCOUNT_CREATE,
                AuthorizationMatrix.ACCOUNT_UPDATE,
                AuthorizationMatrix.ACCOUNT_DELETE,
                AuthorizationMatrix.ACCOUNT_BAN)) {
            assertEquals("hasAnyRole('ROLE_ADMIN')", expr);
        }
    }

    @Test
    void skill_passport_read_own_includes_enseignant() {
        assertTrue(AuthorizationMatrix.SKILL_PASSPORT_READ_OWN.contains("ROLE_ENSEIGNANT"),
                "SKILL_PASSPORT_READ_OWN must allow ROLE_ENSEIGNANT");
        assertFalse(AuthorizationMatrix.SKILL_PASSPORT_READ_ALL.contains("ROLE_ENSEIGNANT"),
                "SKILL_PASSPORT_READ_ALL must NOT allow ROLE_ENSEIGNANT");
    }

    @Test
    void formation_read_does_not_include_basic_users_only() {
        // Snapshot regression : formation read must include at least
        // ROLE_ADMIN, ROLE_CUP, ROLE_D2F, ROLE_FORMATEUR, ROLE_ENSEIGNANT.
        String fr = AuthorizationMatrix.FORMATION_READ;
        for (String required : List.of(
                "ROLE_ADMIN", "ROLE_CUP", "ROLE_D2F", "ROLE_ENSEIGNANT", "ROLE_FORMATEUR")) {
            assertTrue(fr.contains(required),
                    "FORMATION_READ must include " + required + " but was " + fr);
        }
    }

    @Test
    void no_constant_grants_blanket_permitAll_except_PUBLIC_ACCESS() throws Exception {
        for (Field f : allConstantFields()) {
            String expr = (String) f.get(null);
            if (!"PUBLIC_ACCESS".equals(f.getName())) {
                assertNotEquals("permitAll()", expr,
                        "Only PUBLIC_ACCESS may grant unrestricted access, but " + f.getName()
                                + " also does. Likely a misconfiguration.");
            }
        }
    }
}
