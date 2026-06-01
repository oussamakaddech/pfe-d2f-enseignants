package esprit.pfe.auth.security;

import esprit.d2f.common.security.AuthorizationMatrix;
import org.junit.jupiter.api.Test;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;

import static org.junit.jupiter.api.Assertions.*;

class AuthorizationMatrixTest {

    @Test
    void testCompetenceConstants() {
        assertNotNull(AuthorizationMatrix.COMPETENCE_READ);
        assertNotNull(AuthorizationMatrix.COMPETENCE_CREATE);
        assertNotNull(AuthorizationMatrix.COMPETENCE_UPDATE);
        assertNotNull(AuthorizationMatrix.COMPETENCE_DELETE);
        assertNotNull(AuthorizationMatrix.COMPETENCE_ASSIGN);
    }

    @Test
    void testAffectationConstants() {
        assertNotNull(AuthorizationMatrix.AFFECTATION_READ);
        assertNotNull(AuthorizationMatrix.AFFECTATION_CREATE);
        assertNotNull(AuthorizationMatrix.AFFECTATION_UPDATE_SELF);
        assertNotNull(AuthorizationMatrix.AFFECTATION_UPDATE_ALL);
        assertNotNull(AuthorizationMatrix.AFFECTATION_DELETE);
    }

    @Test
    void testBesoinFormationConstants() {
        assertNotNull(AuthorizationMatrix.BESOIN_FORMATION_READ_ALL);
        assertNotNull(AuthorizationMatrix.BESOIN_FORMATION_READ_CUP);
        assertNotNull(AuthorizationMatrix.BESOIN_FORMATION_READ_ENSEIGNANT);
        assertNotNull(AuthorizationMatrix.BESOIN_FORMATION_CREATE);
        assertNotNull(AuthorizationMatrix.BESOIN_FORMATION_UPDATE);
        assertNotNull(AuthorizationMatrix.BESOIN_FORMATION_DELETE);
        assertNotNull(AuthorizationMatrix.BESOIN_FORMATION_APPROVE);
    }

    @Test
    void testFormationConstants() {
        assertNotNull(AuthorizationMatrix.FORMATION_READ);
        assertNotNull(AuthorizationMatrix.FORMATION_CREATE);
        assertNotNull(AuthorizationMatrix.FORMATION_UPDATE);
        assertNotNull(AuthorizationMatrix.FORMATION_DELETE);
        assertNotNull(AuthorizationMatrix.FORMATION_APPROVE);
        assertNotNull(AuthorizationMatrix.FORMATION_READ_OWN);
    }

    @Test
    void testEvaluationConstants() {
        assertNotNull(AuthorizationMatrix.EVALUATION_READ_ALL);
        assertNotNull(AuthorizationMatrix.EVALUATION_READ_CUP);
        assertNotNull(AuthorizationMatrix.EVALUATION_READ_ENSEIGNANT);
        assertNotNull(AuthorizationMatrix.EVALUATION_READ_FORMATEUR);
        assertNotNull(AuthorizationMatrix.EVALUATION_CREATE);
        assertNotNull(AuthorizationMatrix.EVALUATION_UPDATE);
        assertNotNull(AuthorizationMatrix.EVALUATION_DELETE);
        assertNotNull(AuthorizationMatrix.EVALUATION_MARK_ENTRY);
    }

    @Test
    void testCertificatConstants() {
        assertNotNull(AuthorizationMatrix.CERTIFICAT_READ);
        assertNotNull(AuthorizationMatrix.CERTIFICAT_CREATE);
        assertNotNull(AuthorizationMatrix.CERTIFICAT_UPDATE);
        assertNotNull(AuthorizationMatrix.CERTIFICAT_DELETE);
    }

    @Test
    void testRiceConstants() {
        assertNotNull(AuthorizationMatrix.RICE_READ);
        assertNotNull(AuthorizationMatrix.RICE_CREATE);
        assertNotNull(AuthorizationMatrix.RICE_UPDATE);
        assertNotNull(AuthorizationMatrix.RICE_DELETE);
    }

    @Test
    void testDashboardConstants() {
        assertNotNull(AuthorizationMatrix.DASHBOARD_ADMIN_FULL);
        assertNotNull(AuthorizationMatrix.DASHBOARD_ADMIN_LIMITED);
    }

    @Test
    void testAccountConstants() {
        assertNotNull(AuthorizationMatrix.ACCOUNT_READ);
        assertNotNull(AuthorizationMatrix.ACCOUNT_CREATE);
        assertNotNull(AuthorizationMatrix.ACCOUNT_UPDATE);
        assertNotNull(AuthorizationMatrix.ACCOUNT_DELETE);
        assertNotNull(AuthorizationMatrix.ACCOUNT_BAN);
        assertNotNull(AuthorizationMatrix.ACCOUNT_VIEW_PROFILE);
        assertNotNull(AuthorizationMatrix.ACCOUNT_EDIT_OWN);
    }

    @Test
    void testGatewayAndPublicConstants() {
        assertNotNull(AuthorizationMatrix.GATEWAY_ACCESS);
        assertNotNull(AuthorizationMatrix.PUBLIC_ACCESS);
    }

    @Test
    void testPrivateConstructor() throws Exception {
        Constructor<AuthorizationMatrix> constructor = AuthorizationMatrix.class.getDeclaredConstructor();
        constructor.setAccessible(true);
        InvocationTargetException exception = assertThrows(InvocationTargetException.class, constructor::newInstance);
        assertTrue(exception.getCause() instanceof UnsupportedOperationException);
        assertEquals("Utility class", exception.getCause().getMessage());
    }
}
