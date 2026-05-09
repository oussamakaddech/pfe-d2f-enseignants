package esprit.pfe.auth.security;

import org.junit.jupiter.api.Test;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;

import static org.junit.jupiter.api.Assertions.*;

class AuthorizationMatrixTest {

    @Test
    void testConstructorIsPrivate() throws NoSuchMethodException {
        Constructor<AuthorizationMatrix> constructor = AuthorizationMatrix.class.getDeclaredConstructor();
        assertTrue(java.lang.reflect.Modifier.isPrivate(constructor.getModifiers()));
        constructor.setAccessible(true);
        
        InvocationTargetException exception = assertThrows(InvocationTargetException.class, constructor::newInstance);
        assertTrue(exception.getCause() instanceof UnsupportedOperationException);
    }

    @Test
    void testConstantsArePresent() {
        assertNotNull(AuthorizationMatrix.COMPETENCE_READ);
        assertNotNull(AuthorizationMatrix.ACCOUNT_READ);
        assertNotNull(AuthorizationMatrix.PUBLIC_ACCESS);
    }
}
