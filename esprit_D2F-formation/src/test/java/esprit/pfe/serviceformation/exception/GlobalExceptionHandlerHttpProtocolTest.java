package esprit.pfe.serviceformation.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Erreurs de protocole HTTP : 406 / 405 (et non 500 via le catch-all). */
class GlobalExceptionHandlerHttpProtocolTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private final MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/exports/formations/csv");

    @Test
    void notAcceptable_returns406_withoutBody() {
        var response = handler.handleNotAcceptable(
                new HttpMediaTypeNotAcceptableException(List.of(MediaType.valueOf("text/csv"))));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_ACCEPTABLE);
        assertThat(response.getBody()).isNull();
    }

    @Test
    void methodNotSupported_returns405_withAllowHeader() {
        var response = handler.handleMethodNotSupported(
                new HttpRequestMethodNotSupportedException("DELETE", List.of("GET", "PUT")), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
        assertThat(response.getHeaders().getAllow()).containsExactlyInAnyOrder(HttpMethod.GET, HttpMethod.PUT);
        assertThat(String.valueOf(response.getBody())).contains("DELETE");
    }
}
