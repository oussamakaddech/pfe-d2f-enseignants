package esprit.pfe.auth.Security;


import com.nimbusds.jose.jwk.source.ImmutableSecret;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import javax.crypto.spec.SecretKeySpec;
import java.util.Arrays;
import java.util.List;
import java.util.Collection;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true, securedEnabled = true)
public class SecurityConfig {
    @Value("${jwt.secret}")
    private String secretKey;

    /** Origines autorisées — lues depuis application.properties (conformité DSI §2.3 CORS) */
    @Value("${cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private String allowedOriginsRaw;

    @Bean
    public PasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity httpSecurity, JwtAuthenticationConverter jwtAuthenticationConverter) throws Exception {
        return httpSecurity
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(ar -> ar
                        // Endpoints publics — auth seulement
                        .requestMatchers(
                            "/api/v1/auth/login",
                            "/api/v1/auth/signup",
                            "/api/v1/auth/forgot-password",
                            "/api/v1/auth/reset-password",
                            "/api/v1/auth/confirm",
                            "/actuator/health",
                            "/actuator/info"
                        ).permitAll()
                        // Tout le reste requiert une authentification
                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint())
                        .accessDeniedHandler(accessDeniedHandler())
                )
                .oauth2ResourceServer(oa -> oa.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter)))
                .build();
    }

    @Bean
    public AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, authException) -> {
            response.setContentType("application/json");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            String traceId = java.util.UUID.randomUUID().toString();
            String timestamp = java.time.LocalDateTime.now().toString();
            String path = request.getRequestURI();
            response.getWriter().write(
                String.format("{\"timestamp\":\"%s\",\"status\":401,\"errorCode\":\"AUTH-401\",\"message\":\"Unauthorized or session expired.\",\"path\":\"%s\",\"traceId\":\"%s\"}",
                    timestamp, path, traceId));
        };
    }

    @Bean
    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            response.setContentType("application/json");
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            String traceId = java.util.UUID.randomUUID().toString();
            String timestamp = java.time.LocalDateTime.now().toString();
            String path = request.getRequestURI();
            response.getWriter().write(
                String.format("{\"timestamp\":\"%s\",\"status\":403,\"errorCode\":\"AUTH-403\",\"message\":\"Access denied.\",\"path\":\"%s\",\"traceId\":\"%s\"}",
                    timestamp, path, traceId));
        };
    }


    @Bean
    JwtEncoder jwtEncoder(){
        return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey.getBytes()));
    }

    @Bean
    JwtDecoder jwtDecoder(){
        // Utilise la clé injectée via @Value("${jwt.secret}")
        SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(), "HmacSHA512");
        return NimbusJwtDecoder.withSecretKey(secretKeySpec).macAlgorithm(MacAlgorithm.HS512).build();
    }


    @Bean
    public AuthenticationManager authenticationManager(UserDetailsService userDetailsService){
        DaoAuthenticationProvider daoAuthenticationProvider = new DaoAuthenticationProvider();
        daoAuthenticationProvider.setPasswordEncoder(passwordEncoder());
        daoAuthenticationProvider.setUserDetailsService(userDetailsService);
        return new ProviderManager(daoAuthenticationProvider);
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            String scope = jwt.getClaimAsString("scope");
            java.util.ArrayList<GrantedAuthority> authorities = new java.util.ArrayList<>();
            if (scope != null && !scope.isBlank()) {
                for (String role : scope.split(" ")) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
                }
            }
            return authorities;
        });
        return converter;
    }

    /**
     * CORS — conformité DSI §2.3 : restreint aux origines internes uniquement.
     * Les origines autorisées sont lues depuis la propriété cors.allowed-origins
     * (définie dans application.properties ou variable d'environnement CORS_ALLOWED_ORIGINS).
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.asList(allowedOriginsRaw.split(","));
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
