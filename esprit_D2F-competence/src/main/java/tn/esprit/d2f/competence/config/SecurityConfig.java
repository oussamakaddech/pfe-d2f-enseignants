package tn.esprit.d2f.competence.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import javax.crypto.spec.SecretKeySpec;

/**
 * Configuration de la sécurité Spring Security.
 *
 * <p>Stratégie :
 * <ul>
 *   <li>Endpoints Swagger / Actuator : {@code permitAll()}</li>
 *   <li>GET {@code /api/**} : rôles {@code USER}, {@code ADMIN} ou {@code MANAGER}</li>
 *   <li>POST / PUT / PATCH {@code /api/**} : rôles {@code ADMIN} ou {@code MANAGER}</li>
 *   <li>DELETE {@code /api/**} : rôle {@code ADMIN} uniquement</li>
 * </ul>
 *
 * <p>Les rôles sont extraits du claim JWT {@code roles} (liste de chaînes).
 * Exemples de valeurs acceptées : {@code "ROLE_USER"}, {@code "ROLE_ADMIN"}, {@code "ROLE_MANAGER"}.
 * Si le token ne contient pas le préfixe {@code ROLE_}, le converter l'ajoute automatiquement.
 */
@Configuration
@EnableMethodSecurity(prePostEnabled = true, securedEnabled = true)
public class SecurityConfig {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Documentation & monitoring – librement accessibles
                        .requestMatchers(
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/actuator/**"
                        ).permitAll()
                        // Lecture : tous les rôles
                        .requestMatchers(HttpMethod.GET, "/api/**")
                            .hasAnyRole("admin", "CUP", "D2F", "Formateur")
                        // Création / modification : admin, CUP, D2F
                        .requestMatchers(HttpMethod.POST, "/api/**")
                            .hasAnyRole("admin", "CUP", "D2F", "Formateur")
                        .requestMatchers(HttpMethod.PUT, "/api/**")
                            .hasAnyRole("admin", "CUP", "D2F", "Formateur")
                        .requestMatchers(HttpMethod.PATCH, "/api/**")
                            .hasAnyRole("admin", "CUP", "D2F", "Formateur")
                        // Suppression : admin uniquement
                        .requestMatchers(HttpMethod.DELETE, "/api/**")
                            .hasAnyRole("admin", "CUP", "D2F")
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 ->
                        oauth2.jwt(jwt -> jwt
                                .decoder(jwtDecoder())
                                .jwtAuthenticationConverter(jwtAuthenticationConverter())
                        )
                );
        return http.build();
    }

    /**
     * Convertit le claim JWT {@code roles} en {@link org.springframework.security.core.GrantedAuthority}.
     * Ajoute le préfixe {@code ROLE_} si absent pour compatibilité avec Spring Security.
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authoritiesConverter = new JwtGrantedAuthoritiesConverter();
        authoritiesConverter.setAuthoritiesClaimName("scope");   // nom du claim dans le JWT (auth service utilise "scope")
        authoritiesConverter.setAuthorityPrefix("ROLE_");        // Spring Security convention

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authoritiesConverter);
        return converter;
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        SecretKeySpec secretKeySpec = new SecretKeySpec(jwtSecret.getBytes(), "HmacSHA512");
        return NimbusJwtDecoder
                .withSecretKey(secretKeySpec)
                .macAlgorithm(MacAlgorithm.HS512)
                .build();
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOriginPatterns(
                                "http://localhost:[*]",
                                "https://esprit-d2f.esprit.tn",
                                "https://esprit-d2f.esprit.tn:[*]"
                        )
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }
}
