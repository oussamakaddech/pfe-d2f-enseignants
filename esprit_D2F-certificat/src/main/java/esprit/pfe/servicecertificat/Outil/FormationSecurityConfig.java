package esprit.pfe.servicecertificat.Outil;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

import javax.crypto.spec.SecretKeySpec;

@Configuration
public class FormationSecurityConfig {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Active la gestion CORS (les règles CORS sont définies dans votre WebMvcConfigurer)
                .cors(Customizer.withDefaults())
                // Désactive CSRF (en mode stateless avec JWT, CSRF n'est pas nécessaire)
                .csrf(csrf -> csrf.disable())
                // Configuration de la session en mode stateless
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Autorisation des requêtes
                .authorizeHttpRequests(auth -> auth
                        // Vous pouvez définir ici des endpoints publics si nécessaire, par exemple :
                        .requestMatchers("/**").permitAll()
                        // Pour l'instant, toutes les requêtes nécessitent une authentification
                        .anyRequest().authenticated()
                )
                // Configuration du Resource Server pour la validation du JWT
                .oauth2ResourceServer(oauth2 ->
                        oauth2.jwt(jwtConfigurer -> {
                            jwtConfigurer.decoder(jwtDecoder());
                            // Si besoin, vous pouvez ajouter ici un JwtAuthenticationConverter personnalisé
                        })
                );
        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        // Construction d'un JwtDecoder basé sur le secret et HmacSHA512
        SecretKeySpec secretKeySpec = new SecretKeySpec(jwtSecret.getBytes(), "HmacSHA512");
        return NimbusJwtDecoder
                .withSecretKey(secretKeySpec)
                .macAlgorithm(MacAlgorithm.HS512)
                .build();
    }
}
