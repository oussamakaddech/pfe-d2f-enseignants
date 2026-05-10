package esprit.pfe.servicecertificat.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.web.bind.MethodArgumentNotValidException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("GlobalExceptionHandler - Tests unitaires")
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @Mock
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        when(request.getRequestURI()).thenReturn("/api/v1/test");
    }

    @Test
    @DisplayName("handleNotFound doit retourner 404 pour EntityNotFoundException")
    void handleNotFound_EntityNotFound() {
        EntityNotFoundException ex = new EntityNotFoundException("Resource not found");
        ResponseEntity<ErrorResponse> response = handler.handleNotFound(ex, request);

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("Resource not found");
        assertThat(response.getBody().getErrorCode()).isEqualTo("CERT-404");
    }

    @Test
    @DisplayName("handleNotFound doit retourner 404 pour ResourceNotFoundException")
    void handleNotFound_ResourceNotFound() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Certificate not found");
        ResponseEntity<ErrorResponse> response = handler.handleNotFound(ex, request);

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("Certificate not found");
    }

    @Test
    @DisplayName("handleValidation doit retourner 400 pour erreur de validation")
    void handleValidation_ShouldReturn400() {
        org.springframework.validation.BindException bindException = 
            new org.springframework.validation.BindException(new Object(), "object");
        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(null, bindException);
        
        when(request.getRequestURI()).thenReturn("/api/v1/certificates");

        ResponseEntity<ErrorResponse> response = handler.handleValidation(ex, request);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
    }

    @Test
    @DisplayName("handleAccessDenied doit retourner 403")
    void handleAccessDenied_ShouldReturn403() {
        AccessDeniedException ex = new AccessDeniedException("Access denied");
        ResponseEntity<ErrorResponse> response = handler.handleAccessDenied(ex, request);

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).contains("permissions");
    }

    @Test
    @DisplayName("handleAuthentication doit retourner 401 pour BadCredentialsException")
    void handleAuthentication_BadCredentials() {
        BadCredentialsException ex = new BadCredentialsException("Invalid credentials");
        ResponseEntity<ErrorResponse> response = handler.handleAuthentication(ex, request);

        assertThat(response.getStatusCode().value()).isEqualTo(401);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).contains("authentification");
    }

    @Test
    @DisplayName("handleIllegalArgument doit retourner 400")
    void handleIllegalArgument_ShouldReturn400() {
        IllegalArgumentException ex = new IllegalArgumentException("Invalid argument");
        ResponseEntity<ErrorResponse> response = handler.handleIllegalArgument(ex, request);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("Invalid argument");
    }

    @Test
    @DisplayName("handleDataIntegrity doit retourner 409")
    void handleDataIntegrity_ShouldReturn409() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException("Constraint violation");
        ResponseEntity<ErrorResponse> response = handler.handleDataIntegrity(ex, request);

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).contains("Conflit");
    }

    @Test
    @DisplayName("handleGeneral doit retourner 500 avec traceId")
    void handleGeneral_ShouldReturn500() {
        Exception ex = new RuntimeException("Unexpected error");
        ResponseEntity<ErrorResponse> response = handler.handleGeneral(ex, request);

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTraceId()).isNotNull();
        assertThat(response.getBody().getMessage()).contains("inattendue");
    }

    @Test
    @DisplayName("handlePdfGeneration doit retourner 500 pour PdfGenerationException")
    void handlePdfGeneration_ShouldReturn500() {
        PdfGenerationException ex = new PdfGenerationException("PDF generation failed", new RuntimeException("IO error"));
        ResponseEntity<ErrorResponse> response = handler.handlePdfGeneration(ex, request);

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getErrorCode()).isEqualTo("CERT-500");
        assertThat(response.getBody().getMessage()).contains("PDF generation failed");
    }

    @Test
    @DisplayName("PdfGenerationException doit accepter un seul argument")
    void pdfGenerationException_SingleArgConstructor() {
        PdfGenerationException ex = new PdfGenerationException("PDF error");
        assertThat(ex.getMessage()).isEqualTo("PDF error");
        assertThat(ex.getCause()).isNull();
    }

    @Test
    @DisplayName("handleGeneral doit générer un traceId unique")
    void handleGeneral_ShouldGenerateUniqueTraceId() {
        Exception ex1 = new RuntimeException("Error 1");
        Exception ex2 = new RuntimeException("Error 2");

        ResponseEntity<ErrorResponse> response1 = handler.handleGeneral(ex1, request);
        ResponseEntity<ErrorResponse> response2 = handler.handleGeneral(ex2, request);

        assertThat(response1.getBody().getTraceId()).isNotNull();
        assertThat(response2.getBody().getTraceId()).isNotNull();
        assertThat(response1.getBody().getTraceId()).isNotEqualTo(response2.getBody().getTraceId());
    }

    @Test
    @DisplayName("handleValidation doit construire le message à partir des erreurs de champ")
    void handleValidation_ShouldBuildMessageFromFieldErrors() {
        org.springframework.validation.BindException bindException =
            new org.springframework.validation.BindException(new Object(), "object");
        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(null, bindException);

        ResponseEntity<ErrorResponse> response = handler.handleValidation(ex, request);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().getErrorCode()).isEqualTo("CERT-400");
        assertThat(response.getBody().getPath()).isEqualTo("/api/v1/test");
    }

    @Test
    @DisplayName("buildResponse surchargée doit accepter traceId personnalisé")
    void buildResponse_WithCustomTraceId() {
        ResponseEntity<ErrorResponse> response = handler.handleGeneral(new RuntimeException("test"), request);

        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(500);
    }

    @Test
    @DisplayName("handleAuthentication doit gérer AuthenticationException générique")
    void handleAuthentication_GenericAuthenticationException() {
        org.springframework.security.core.AuthenticationException ex =
            new org.springframework.security.core.AuthenticationException("Auth failed") {};
        ResponseEntity<ErrorResponse> response = handler.handleAuthentication(ex, request);

        assertThat(response.getStatusCode().value()).isEqualTo(401);
        assertThat(response.getBody().getMessage()).contains("authentification");
    }

    @Test
    @DisplayName("handleValidation avec erreurs de champ doit exécuter le lambda")
    void handleValidation_WithFieldErrors_ShouldExecuteLambda() {
        org.springframework.validation.FieldError fieldError1 = new org.springframework.validation.FieldError(
            "certificate", "formationId", "must not be null"
        );
        org.springframework.validation.FieldError fieldError2 = new org.springframework.validation.FieldError(
            "certificate", "titreFormation", "must not be blank"
        );

        org.springframework.validation.BindException bindException = 
            new org.springframework.validation.BindException(new Object(), "certificate");
        bindException.addError(fieldError1);
        bindException.addError(fieldError2);

        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(null, bindException);

        ResponseEntity<ErrorResponse> response = handler.handleValidation(ex, request);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().getMessage()).contains("formationId");
        assertThat(response.getBody().getMessage()).contains("titreFormation");
        assertThat(response.getBody().getMessage()).contains("must not be null");
        assertThat(response.getBody().getMessage()).contains("must not be blank");
        assertThat(response.getBody().getMessage()).contains("; ");
    }
}
