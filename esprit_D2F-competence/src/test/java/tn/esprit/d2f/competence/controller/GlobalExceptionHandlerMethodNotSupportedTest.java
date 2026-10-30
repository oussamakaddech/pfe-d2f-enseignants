package tn.esprit.d2f.competence.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.HttpRequestMethodNotSupportedException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Méthode HTTP non prise en charge : 405 avec l'en-tête Allow (et non 500 via le catch-all). */
class GlobalExceptionHandlerMethodNotSupportedTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private final MockHttpServletRequest request =
            new MockHttpServletRequest("GET", "/api/v1/sous-competences/1/enfants");

    @Test
    void unsupportedMethod_returns405_withAllowHeader() {
        var ex = new HttpRequestMethodNotSupportedException("GET", List.of("POST"));

        var response = handler.handleMethodNotSupported(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
        assertThat(response.getHeaders().getAllow()).containsExactly(HttpMethod.POST);
        assertThat(String.valueOf(response.getBody())).contains("GET").contains("COMP-405");
    }

    @Test
    void unsupportedMethod_withoutKnownMethods_returns405() {
        var ex = new HttpRequestMethodNotSupportedException("PUT");

        var response = handler.handleMethodNotSupported(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
        assertThat(response.getHeaders().getAllow()).isEmpty();
    }
}
