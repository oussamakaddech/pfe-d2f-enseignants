package esprit.pfe.serviceanalyse.service.passport;

import esprit.pfe.serviceanalyse.exception.PassportAccessDeniedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import org.springframework.security.oauth2.jwt.Jwt;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SkillPassportAuthorizationServiceTest {

    private SkillPassportAuthorizationService service;

    @BeforeEach
    void setup() {
        service = new SkillPassportAuthorizationService();
    }

    private Authentication auth(String name, String... roles) {
        List<SimpleGrantedAuthority> authorities = List.of(roles).stream()
                .map(SimpleGrantedAuthority::new).toList();
        return new UsernamePasswordAuthenticationToken(name, null, authorities);
    }

    @Test
    void admin_canAccessAnyPassport() {
        Authentication admin = auth("admin", "ROLE_ADMIN");
        assertThatCode(() -> service.checkAccess(admin, "anyuser")).doesNotThrowAnyException();
    }

    @Test
    void cup_canAccessAnyPassport() {
        Authentication cup = auth("cup1", "ROLE_CUP");
        assertThatCode(() -> service.checkAccess(cup, "anyteacher")).doesNotThrowAnyException();
    }

    @Test
    void enseignant_canAccessOwnPassport() {
        Authentication ens = auth("jdoe", "ROLE_ENSEIGNANT");
        assertThatCode(() -> service.checkAccess(ens, "jdoe")).doesNotThrowAnyException();
    }

    @Test
    void enseignant_cannotAccessOtherPassport() {
        Authentication ens = auth("jdoe", "ROLE_ENSEIGNANT");
        assertThatThrownBy(() -> service.checkAccess(ens, "otheruser"))
                .isInstanceOf(PassportAccessDeniedException.class)
                .hasMessageContaining("propre passeport");
    }

    // ── Parité : animateur / formateur accèdent à LEUR propre passeport ──────

    @Test
    void animateur_canAccessOwnPassport() {
        Authentication animateur = auth("anim1", "ROLE_ANIMATEUR");
        assertThatCode(() -> service.checkAccess(animateur, "anim1")).doesNotThrowAnyException();
    }

    @Test
    void animateur_cannotAccessOtherPassport() {
        Authentication animateur = auth("anim1", "ROLE_ANIMATEUR");
        assertThatThrownBy(() -> service.checkAccess(animateur, "otheruser"))
                .isInstanceOf(PassportAccessDeniedException.class);
    }

    @Test
    void formateur_canAccessOwnPassport() {
        Authentication formateur = auth("form1", "ROLE_FORMATEUR");
        assertThatCode(() -> service.checkAccess(formateur, "form1")).doesNotThrowAnyException();
    }

    @Test
    void chefDepartement_canAccessOwnButNotOther() {
        Authentication chef = auth("chef1", "ROLE_CHEF_DEPARTEMENT");
        assertThatCode(() -> service.checkAccess(chef, "chef1")).doesNotThrowAnyException();
        assertThatThrownBy(() -> service.checkAccess(chef, "otheruser"))
                .isInstanceOf(PassportAccessDeniedException.class);
    }

    @Test
    void responsableDossier_canAccessOwnButNotOther() {
        Authentication rd = auth("rd1", "ROLE_RESPONSABLE_DOSSIER");
        assertThatCode(() -> service.checkAccess(rd, "rd1")).doesNotThrowAnyException();
        assertThatThrownBy(() -> service.checkAccess(rd, "otheruser"))
                .isInstanceOf(PassportAccessDeniedException.class);
    }

    @Test
    void nullAuthentication_throwsException() {
        assertThatThrownBy(() -> service.checkAccess(null, "jdoe"))
                .isInstanceOf(PassportAccessDeniedException.class)
                .hasMessageContaining("Authentification");
    }

    @Test
    void extractUsername_returnsAuthenticationName() {
        Authentication ens = auth("jdoe", "ROLE_ENSEIGNANT");
        assertThat(service.extractUsername(ens)).isEqualTo("jdoe");
    }

    @Test
    void extractUsername_withJwtPrincipal_returnsSubject() {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn("jdoe");
        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(jwt);

        assertThat(service.extractUsername(auth)).isEqualTo("jdoe");
    }
}
