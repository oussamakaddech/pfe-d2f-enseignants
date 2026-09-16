package esprit.pfe.servicecertificat.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("ResourceNotFoundException - Tests")
class ResourceNotFoundExceptionTest {

    @Test
    @DisplayName("Constructor with message")
    void constructorWithMessage() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Resource not found");
        assertEquals("Resource not found", ex.getMessage());
    }

    @Test
    @DisplayName("Exception should be a RuntimeException")
    void isRuntimeException() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Test");
        assertTrue(ex instanceof RuntimeException);
    }

    @Test
    @DisplayName("Exception should have @ResponseStatus annotation")
    void hasResponseStatusAnnotation() {
        org.springframework.web.bind.annotation.ResponseStatus annotation =
            ResourceNotFoundException.class.getAnnotation(org.springframework.web.bind.annotation.ResponseStatus.class);
        assertNotNull(annotation);
        assertEquals(org.springframework.http.HttpStatus.NOT_FOUND, annotation.value());
    }
}