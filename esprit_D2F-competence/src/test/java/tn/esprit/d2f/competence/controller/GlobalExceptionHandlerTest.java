package tn.esprit.d2f.competence.controller;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("GlobalExceptionHandler - Tests")
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
        request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/test");
    }

    @Test
    @DisplayName("handleNotFound : retourne 404")
    void testHandleNotFound() {
        EntityNotFoundException ex = new EntityNotFoundException("Non trouvé");
        ResponseEntity<Map<String, Object>> response = exceptionHandler.handleNotFound(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody())
            .isNotNull()
            .containsEntry("errorCode", "COMP-404")
            .containsEntry("message", "Non trouvé");
    }

    @Test
    @DisplayName("handleBadRequest : retourne 400")
    void testHandleBadRequest() {
        IllegalArgumentException ex = new IllegalArgumentException("Mauvaise requête");
        ResponseEntity<Map<String, Object>> response = exceptionHandler.handleBadRequest(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("errorCode", "COMP-400");
    }

    @Test
    @DisplayName("handleValidation : retourne 400 avec erreurs de validation")
    void testHandleValidation() {
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        when(ex.getBindingResult()).thenReturn(bindingResult);
        
        FieldError fieldError1 = new FieldError("objectName", "field1", "message1");
        FieldError fieldError2 = new FieldError("objectName", "field2", "message2");
        when(bindingResult.getFieldErrors()).thenReturn(List.of(fieldError1, fieldError2));

        ResponseEntity<Map<String, Object>> response = exceptionHandler.handleValidation(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody())
            .containsEntry("errorCode", "COMP-422")
            .containsEntry("message", "field1: message1; field2: message2");
    }

    @Test
    @DisplayName("handleValidation : gère les erreurs vides")
    void testHandleValidationEmpty() {
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        when(ex.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldErrors()).thenReturn(List.of());

        ResponseEntity<Map<String, Object>> response = exceptionHandler.handleValidation(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("message", "Erreur de validation");
    }

    @Test
    @DisplayName("handleDataIntegrityViolation : unique constraint")
    void testHandleDataIntegrityViolationUnique() {
        Throwable rootCause = new RuntimeException("duplicate key value violates unique constraint");
        DataIntegrityViolationException ex = new DataIntegrityViolationException("Error", rootCause);
        
        ResponseEntity<Map<String, Object>> response = exceptionHandler.handleDataIntegrityViolation(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("errorCode", "COMP-409");
        assertThat(response.getBody().get("message").toString()).contains("existe déjà");
    }

    @Test
    @DisplayName("handleDataIntegrityViolation : generic constraint")
    void testHandleDataIntegrityViolationGeneric() {
        Throwable rootCause = new RuntimeException("foreign key constraint");
        DataIntegrityViolationException ex = new DataIntegrityViolationException("Error", rootCause);
        
        ResponseEntity<Map<String, Object>> response = exceptionHandler.handleDataIntegrityViolation(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().get("message").toString()).contains("intégrité violée");
    }

    @Test
    @DisplayName("handleGeneral : retourne 500")
    void testHandleGeneral() {
        Exception ex = new Exception("Erreur fatale");
        ResponseEntity<Map<String, Object>> response = exceptionHandler.handleGeneral(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).containsEntry("errorCode", "COMP-500");
    }
}
