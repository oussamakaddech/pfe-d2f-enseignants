package esprit.pfe.serviceanalyse.client;

import esprit.pfe.serviceanalyse.exception.PredictiveAnalyticsUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ResilientCallerTest {

    private final RestTemplate restTemplate = mock(RestTemplate.class);
    private final ResilientCaller caller = new ResilientCaller();

    @Test
    void get_class_happyPath() {
        Dummy body = new Dummy();
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), eq(Dummy.class)))
                .thenReturn(new ResponseEntity<>(body, HttpStatus.OK));

        Dummy result = caller.get("u", "tok", restTemplate, Dummy.class);
        assertSame(body, result);
    }

    @Test
    void get_class_loudFailure() {
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), eq(Dummy.class)))
                .thenThrow(new ResourceAccessException("down"));

        assertThrows(PredictiveAnalyticsUnavailableException.class,
                () -> caller.get("u", "tok", restTemplate, Dummy.class));
    }

    @Test
    void get_ref_happyPath() {
        PageLike page = mock(PageLike.class);
        ParameterizedTypeReference<PageLike> ref = new ParameterizedTypeReference<PageLike>() {};
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), eq(ref)))
                .thenReturn(new ResponseEntity<>(page, HttpStatus.OK));

        PageLike result = caller.get("u", "tok", restTemplate, ref);
        assertSame(page, result);
    }

    @Test
    void get_ref_loudFailure() {
        ParameterizedTypeReference<PageLike> ref = new ParameterizedTypeReference<PageLike>() {};
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), eq(ref)))
                .thenThrow(new ResourceAccessException("down"));

        assertThrows(PredictiveAnalyticsUnavailableException.class,
                () -> caller.get("u", "tok", restTemplate, ref));
    }

    @Test
    void post_happyPath() {
        Dummy body = new Dummy();
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), eq(Dummy.class)))
                .thenReturn(new ResponseEntity<>(body, HttpStatus.OK));

        Dummy result = caller.post("u", "tok", restTemplate, "payload", Dummy.class);
        assertSame(body, result);
    }

    @Test
    void post_loudFailure() {
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), eq(Dummy.class)))
                .thenThrow(new ResourceAccessException("down"));

        assertThrows(PredictiveAnalyticsUnavailableException.class,
                () -> caller.post("u", "tok", restTemplate, "payload", Dummy.class));
    }

    @Test
    void patch_happyPath() {
        Dummy body = new Dummy();
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), eq(Dummy.class)))
                .thenReturn(new ResponseEntity<>(body, HttpStatus.OK));

        Dummy result = caller.patch("u", "tok", restTemplate, "payload", Dummy.class);
        assertSame(body, result);
    }

    @Test
    void patch_loudFailure() {
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), eq(Dummy.class)))
                .thenThrow(new ResourceAccessException("down"));

        assertThrows(PredictiveAnalyticsUnavailableException.class,
                () -> caller.patch("u", "tok", restTemplate, "payload", Dummy.class));
    }

    /** Lightweight stand-in for a DTO. */
    static class Dummy {
    }

    /** Stand-in for a Page type. */
    interface PageLike {
        List<Object> content();
    }
}
