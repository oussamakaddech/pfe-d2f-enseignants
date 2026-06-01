package esprit.pfe.auth.error;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TokenExpiredExceptionTest {

    @Test
    void constructor_ShouldStoreMessageAndStatus() {
        TokenExpiredException exception = new TokenExpiredException("Confirmation token has expired");

        assertEquals("Confirmation token has expired", exception.getMessage());
        assertEquals("Confirmation token has expired", exception.getErrorMessage());
        assertEquals(410, exception.getStatus());
    }
}
