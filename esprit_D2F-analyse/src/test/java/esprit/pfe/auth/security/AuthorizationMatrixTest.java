package esprit.pfe.auth.security;

import org.junit.jupiter.api.Test;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;

import static org.junit.jupiter.api.Assertions.*;

class AuthorizationMatrixTest {

    @Test
    void testConstants() {
        assertNotNull(AuthorizationMatrix.COMPETENCE_READ);
        assertNotNull(AuthorizationMatrix.GATEWAY_ACCESS);
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
