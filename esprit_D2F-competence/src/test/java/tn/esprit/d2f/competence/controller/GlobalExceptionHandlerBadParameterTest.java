package tn.esprit.d2f.competence.controller;

import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/** Paramètre absent ou mal typé : 400 (et non 500 via le catch-all). */
class GlobalExceptionHandlerBadParameterTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private final MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/test");

    @Test
    void missingRequestParameter_returns400() {
        var response = handler.handleBadRequestParameter(
                new MissingServletRequestParameterException("start", "LocalDate"), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(String.valueOf(response.getBody())).contains("start");
    }

    @Test
    void typeMismatch_returns400_withoutJavaClassName() {
        var ex = new MethodArgumentTypeMismatchException(
                "N3", Integer.class, "niveau", mock(MethodParameter.class), new IllegalArgumentException());

        var response = handler.handleBadRequestParameter(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(String.valueOf(response.getBody())).contains("niveau").doesNotContain("java.lang");
    }
}
