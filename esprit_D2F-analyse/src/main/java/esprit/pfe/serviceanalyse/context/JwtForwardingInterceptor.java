package esprit.pfe.serviceanalyse.context;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Capture le token JWT de la requête entrante pour le rejouer sur les appels
 * sortants vers les services en aval (compétence, formation, évaluation, ...).
 */
@Component
public class JwtForwardingInterceptor implements HandlerInterceptor {

    private static final ThreadLocal<String> BEARER = new ThreadLocal<>();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            BEARER.set(header.substring(7));
        } else {
            BEARER.remove();
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        BEARER.remove();
    }

    public static String getBearerToken() {
        return BEARER.get();
    }
}
