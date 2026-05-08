package esprit.pfe.auth.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtTokenFilterTest {

    private final JwtTokenFilter filter = new JwtTokenFilter();

    @ParameterizedTest
    @ValueSource(strings = {"Bearer some.jwt.token", "Basic abc123"})
    @NullAndEmptySource
    void doFilterInternal_withVariousAuthorizationHeaders_shouldContinueChain(String authHeader) throws ServletException, IOException {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        FilterChain chain = mock(FilterChain.class);

        when(request.getHeader("Authorization")).thenReturn(authHeader);

        filter.doFilterInternal(request, response, chain);

        verify(chain).doFilter(request, response);
    }
}