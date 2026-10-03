package esprit.pfe.serviceevaluation.services;

import esprit.pfe.serviceevaluation.client.FormationClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Périmètre de lecture des évaluations — logique partagée par
 * {@code EvaluationFormateurService} et {@code EvaluationGlobaleService}
 * (elle y était dupliquée à l'identique).
 */
class EvaluationListScopeTest {

    private final FormationClient formationClient = mock(FormationClient.class);

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private static void authenticate(Object principal, String... roles) {
        List<SimpleGrantedAuthority> authorities = List.of(roles).stream()
                .map(SimpleGrantedAuthority::new)
                .toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, authorities));
    }

    private static Jwt jwtWithEmail(String email) {
        Jwt.Builder builder = Jwt.withTokenValue("token")
                .header("alg", "HS512")
                .claim("sub", "sujet")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(600));
        if (email != null) {
            builder.claim("email", email);
        }
        return builder.build();
    }

    @Test
    @DisplayName("Sans authentification : périmètre personnel vide (aucune évaluation)")
    void resolve_sansAuthentification() {
        SecurityContextHolder.clearContext();

        EvaluationListScope.ListScope scope = EvaluationListScope.resolve(formationClient);

        assertFalse(scope.global());
        assertNull(scope.ficheId());
    }

    @Test
    @DisplayName("Authentification non authentifiée : périmètre personnel vide")
    void resolve_authNonAuthentifiee() {
        UsernamePasswordAuthenticationToken token =
                new UsernamePasswordAuthenticationToken("user", null);
        token.setAuthenticated(false);
        SecurityContextHolder.getContext().setAuthentication(token);

        EvaluationListScope.ListScope scope = EvaluationListScope.resolve(formationClient);

        assertFalse(scope.global());
        assertNull(scope.ficheId());
    }

    @Test
    @DisplayName("ADMIN et ANIMATEUR voient toutes les évaluations")
    void resolve_rolesGlobaux() {
        authenticate("admin", "ROLE_ADMIN");
        assertTrue(EvaluationListScope.resolve(formationClient).global());

        SecurityContextHolder.clearContext();
        authenticate("anim", "ROLE_ANIMATEUR");
        assertTrue(EvaluationListScope.resolve(formationClient).global());
    }

    @Test
    @DisplayName("Enseignant : périmètre limité à sa fiche, résolue via le service formation")
    void resolve_perimetrePersonnel() {
        authenticate("ens@esprit.tn", "ROLE_ENSEIGNANT");
        when(formationClient.getEnseignantById("ens@esprit.tn")).thenReturn(Map.of("id", "E00007"));

        EvaluationListScope.ListScope scope = EvaluationListScope.resolve(formationClient);

        assertFalse(scope.global());
        assertEquals("E00007", scope.ficheId());
    }

    @Test
    @DisplayName("Identité : le claim email du JWT prime sur le nom du principal")
    void callerIdentity_emailDuJwt() {
        authenticate(jwtWithEmail("jwt@esprit.tn"), "ROLE_ENSEIGNANT");
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        assertEquals("jwt@esprit.tn", EvaluationListScope.callerIdentity(auth));
    }

    @Test
    @DisplayName("Identité : JWT sans email (ou vide) → repli sur le nom du principal")
    void callerIdentity_repliSurNom() {
        authenticate(jwtWithEmail(null), "ROLE_ENSEIGNANT");
        Authentication sansEmail = SecurityContextHolder.getContext().getAuthentication();
        assertEquals(sansEmail.getName(), EvaluationListScope.callerIdentity(sansEmail));

        SecurityContextHolder.clearContext();
        authenticate("simple-user", "ROLE_ENSEIGNANT");
        Authentication sansJwt = SecurityContextHolder.getContext().getAuthentication();
        assertEquals("simple-user", EvaluationListScope.callerIdentity(sansJwt));
    }

    @Test
    @DisplayName("Fiche : identité absente ou vide → aucune résolution")
    void resolveFicheId_identiteVide() {
        assertNull(EvaluationListScope.resolveFicheId(formationClient, null));
        assertNull(EvaluationListScope.resolveFicheId(formationClient, "   "));
    }

    @Test
    @DisplayName("Fiche : réponse Map sans id, ou type inattendu → aucune résolution")
    void resolveFicheId_reponsesNonExploitables() {
        when(formationClient.getEnseignantById("sans-id")).thenReturn(Map.of("mail", "x@y.tn"));
        assertNull(EvaluationListScope.resolveFicheId(formationClient, "sans-id"));

        when(formationClient.getEnseignantById("chaine-vide")).thenReturn("  ");
        assertNull(EvaluationListScope.resolveFicheId(formationClient, "chaine-vide"));

        when(formationClient.getEnseignantById("entier")).thenReturn(42);
        assertNull(EvaluationListScope.resolveFicheId(formationClient, "entier"));
    }

    @Test
    @DisplayName("Fiche : réponse texte non vide → id de fiche")
    void resolveFicheId_reponseTexte() {
        when(formationClient.getEnseignantById("mail@esprit.tn")).thenReturn("E00012");

        assertEquals("E00012", EvaluationListScope.resolveFicheId(formationClient, "mail@esprit.tn"));
    }

    @Test
    @DisplayName("Fiche : service formation indisponible → aucune résolution (fail-closed)")
    void resolveFicheId_serviceIndisponible() {
        when(formationClient.getEnseignantById(anyString()))
                .thenThrow(new IllegalStateException("formation injoignable"));

        assertNull(EvaluationListScope.resolveFicheId(formationClient, "ens@esprit.tn"));
    }
}
