package esprit.pfe.serviceanalyse.service.passport;

import esprit.pfe.serviceanalyse.exception.PassportAccessDeniedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

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
    void d2f_canAccessAnyPassport() {
        Authentication d2f = auth("d2f1", "ROLE_D2F");
        assertThatCode(() -> service.checkAccess(d2f, "anyone")).doesNotThrowAnyException();
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

    @Test
    void nullAuthentication_throwsException() {
        assertThatThrownBy(() -> service.checkAccess(null, "jdoe"))
                .isInstanceOf(PassportAccessDeniedException.class)
                .hasMessageContaining("Authentification");
    }

    @Test
    void unknownRole_throwsException() {
        Authentication formateur = auth("form1", "ROLE_FORMATEUR");
        assertThatThrownBy(() -> service.checkAccess(formateur, "jdoe"))
                .isInstanceOf(PassportAccessDeniedException.class);
    }

    @Test
    void extractUsername_returnsAuthenticationName() {
        Authentication ens = auth("jdoe", "ROLE_ENSEIGNANT");
        assertThat(service.extractUsername(ens)).isEqualTo("jdoe");
    }
}
