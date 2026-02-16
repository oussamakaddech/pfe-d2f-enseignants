package esprit.pfe.auth.Security;


import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class JwtTokenFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        // Ici, vous devez ajouter la logique de validation du JWT
        String token = request.getHeader("Authorization");

        if (token != null && token.startsWith("Bearer ")) {
            // Vérifier le token et authentifier l'utilisateur si nécessaire
        }

        filterChain.doFilter(request, response);
    }
}

