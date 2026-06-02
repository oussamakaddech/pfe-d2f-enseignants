package esprit.pfe.auth.error;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.UUID;

@RestControllerAdvice
public class CustomExceptionHandler {

        private static final Logger log = LoggerFactory.getLogger(CustomExceptionHandler.class);
        private static final String ERROR_CODE_PREFIX = "AUTH-";

        @ExceptionHandler(LoginException.class)
        public ResponseEntity<CustomErrorResponse> handleLoginException(LoginException ex,
                        HttpServletRequest request) {
                logHandled(ex.getStatus(), ex.getErrorMessage(), request);
                CustomErrorResponse errorResponse = buildErrorResponse(
                                ex.getStatus(),
                                ex.getErrorMessage(),
                                ERROR_CODE_PREFIX + ex.getStatus(),
                                request.getRequestURI());
                return ResponseEntity.status(HttpStatus.valueOf(ex.getStatus()))
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(errorResponse);
        }

        @ExceptionHandler(BadRequestException.class)
        public ResponseEntity<CustomErrorResponse> handleBadRequestException(BadRequestException ex,
                        HttpServletRequest request) {
                logHandled(ex.getStatus(), ex.getErrorMessage(), request);
                CustomErrorResponse errorResponse = buildErrorResponse(
                                ex.getStatus(),
                                ex.getErrorMessage(),
                                ERROR_CODE_PREFIX + ex.getStatus(),
                                request.getRequestURI());
                return ResponseEntity.status(HttpStatus.valueOf(ex.getStatus()))
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(errorResponse);
        }

        @ExceptionHandler(ConflictException.class)
        public ResponseEntity<CustomErrorResponse> handleConflictException(ConflictException ex,
                        HttpServletRequest request) {
                logHandled(ex.getStatus(), ex.getErrorMessage(), request);
                CustomErrorResponse errorResponse = buildErrorResponse(
                                ex.getStatus(),
                                ex.getErrorMessage(),
                                ERROR_CODE_PREFIX + ex.getStatus(),
                                request.getRequestURI());
                return ResponseEntity.status(HttpStatus.valueOf(ex.getStatus()))
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(errorResponse);
        }

        @ExceptionHandler(ResourceNotFoundException.class)
        public ResponseEntity<CustomErrorResponse> handleResourceNotFoundException(ResourceNotFoundException ex,
                        HttpServletRequest request) {
                logHandled(ex.getStatus(), ex.getErrorMessage(), request);
                CustomErrorResponse errorResponse = buildErrorResponse(
                                ex.getStatus(),
                                ex.getErrorMessage(),
                                ERROR_CODE_PREFIX + ex.getStatus(),
                                request.getRequestURI());
                return ResponseEntity.status(HttpStatus.valueOf(ex.getStatus()))
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(errorResponse);
        }

        @ExceptionHandler(TokenExpiredException.class)
        public ResponseEntity<CustomErrorResponse> handleTokenExpiredException(TokenExpiredException ex,
                        HttpServletRequest request) {
                logHandled(ex.getStatus(), ex.getErrorMessage(), request);
                CustomErrorResponse errorResponse = buildErrorResponse(
                                ex.getStatus(),
                                ex.getErrorMessage(),
                                ERROR_CODE_PREFIX + ex.getStatus(),
                                request.getRequestURI());
                return ResponseEntity.status(HttpStatus.valueOf(ex.getStatus()))
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(errorResponse);
        }

        /**
         * Erreurs de validation des payloads (@Valid) → 400 Bad Request explicite
         * avec le détail du premier champ invalide, plutôt qu'un 500 via le filet
         * de sécurité (audit DSI – validation des entrées).
         */
        @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
        public ResponseEntity<CustomErrorResponse> handleValidationException(
                        org.springframework.web.bind.MethodArgumentNotValidException ex,
                        HttpServletRequest request) {
                org.springframework.validation.FieldError fieldError = ex.getBindingResult().getFieldError();
                String message = (fieldError != null && fieldError.getDefaultMessage() != null)
                                ? fieldError.getDefaultMessage()
                                : "Validation failed";
                logHandled(HttpStatus.BAD_REQUEST.value(), message, request);
                CustomErrorResponse errorResponse = buildErrorResponse(
                                HttpStatus.BAD_REQUEST.value(),
                                message,
                                ERROR_CODE_PREFIX + HttpStatus.BAD_REQUEST.value(),
                                request.getRequestURI());
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(errorResponse);
        }

        /**
         * Toute exception d'authentification Spring Security qui remonte jusqu'au
         * contrôleur (ex. jeton sans sujet refusé par {@code AuthService.refresh})
         * doit produire un 401 propre, jamais un 500.
         */
        @ExceptionHandler(AuthenticationException.class)
        public ResponseEntity<CustomErrorResponse> handleAuthenticationException(AuthenticationException ex,
                        HttpServletRequest request) {
                logHandled(HttpStatus.UNAUTHORIZED.value(), ex.getMessage(), request);
                CustomErrorResponse errorResponse = buildErrorResponse(
                                HttpStatus.UNAUTHORIZED.value(),
                                "Non autorisé ou session expirée.",
                                ERROR_CODE_PREFIX + HttpStatus.UNAUTHORIZED.value(),
                                request.getRequestURI());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(errorResponse);
        }

        /**
         * Filet de sécurité : toute exception non gérée renvoie un 500 propre au
         * format DSI, sans jamais exposer la stacktrace au client (la trace complète
         * est journalisée côté serveur avec un traceId corrélable).
         */
        @ExceptionHandler(Exception.class)
        public ResponseEntity<CustomErrorResponse> handleUnexpectedException(Exception ex,
                        HttpServletRequest request) {
                String traceId = UUID.randomUUID().toString();
                log.error("[AUTH-500] traceId={} {} {} → erreur inattendue",
                                traceId, request.getMethod(), request.getRequestURI(), ex);
                CustomErrorResponse errorResponse = buildErrorResponse(
                                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                                "Une erreur interne est survenue.",
                                ERROR_CODE_PREFIX + HttpStatus.INTERNAL_SERVER_ERROR.value(),
                                request.getRequestURI());
                errorResponse.setTraceId(traceId);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(errorResponse);
        }

        private void logHandled(Integer status, String message, HttpServletRequest request) {
                log.warn("[AUTH-{}] {} {} → {}",
                                status,
                                request.getMethod(),
                                request.getRequestURI(),
                                message);
        }

        private CustomErrorResponse buildErrorResponse(Integer status,
                        String message,
                        String errorCode,
                        String path) {
                HttpStatus httpStatus = HttpStatus.valueOf(status);
                CustomErrorResponse errorResponse = new CustomErrorResponse();
                errorResponse.setStatus(status);
                errorResponse.setError(httpStatus.getReasonPhrase());
                errorResponse.setErrorCode(errorCode);
                errorResponse.setMessage(message);
                errorResponse.setPath(path);
                errorResponse.setTraceId(UUID.randomUUID().toString());
                errorResponse.setTimestamp(LocalDateTime.now().toString());
                return errorResponse;
        }
}