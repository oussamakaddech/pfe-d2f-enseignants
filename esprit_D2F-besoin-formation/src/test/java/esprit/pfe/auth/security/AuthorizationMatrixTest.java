package esprit.pfe.auth.security;

import esprit.d2f.common.security.AuthorizationMatrix;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class AuthorizationMatrixTest {

    @Test
    void testConstants() {
        // Just access the constants to cover the class loading
        assertNotNull(AuthorizationMatrix.BESOIN_FORMATION_READ_ALL);
        assertNotNull(AuthorizationMatrix.BESOIN_FORMATION_CREATE);
        assertNotNull(AuthorizationMatrix.BESOIN_FORMATION_UPDATE);
        assertNotNull(AuthorizationMatrix.BESOIN_FORMATION_DELETE);
        assertNotNull(AuthorizationMatrix.BESOIN_FORMATION_APPROVE);
    }
}
