package esprit.pfe.serviceformation.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CurrentUserTest {

    @Mock
    private Jwt jwt;

    @Test
    void fromJwtWithNullReturnsEmptyFields() {
        CurrentUser user = CurrentUser.fromJwt(null);

        assertThat(user.username()).isNull();
        assertThat(user.userId()).isNull();
        assertThat(user.email()).isNull();
        assertThat(user.roles()).isEmpty();
    }

    @Test
    void fromJwtWithScopeRolesNormalizesRolePrefix() {
        when(jwt.getSubject()).thenReturn("sub123");
        when(jwt.getClaimAsString("userId")).thenReturn("user456");
        when(jwt.getClaimAsString("email")).thenReturn("test@esprit.tn");
        when(jwt.getClaimAsString("scope")).thenReturn("ROLE_ADMIN ROLE_CHEF_DEPARTEMENT openid");

        CurrentUser user = CurrentUser.fromJwt(jwt);

        assertThat(user.username()).isEqualTo("sub123");
        assertThat(user.userId()).isEqualTo("user456");
        assertThat(user.email()).isEqualTo("test@esprit.tn");
        assertThat(user.roles()).containsExactlyInAnyOrder("ADMIN", "CHEF_DEPARTEMENT", "OPENID");
    }

    @Test
    void fromJwtWithBlankScopeReturnsEmptyRoles() {
        when(jwt.getSubject()).thenReturn("sub");
        when(jwt.getClaimAsString("userId")).thenReturn("uid");
        when(jwt.getClaimAsString("email")).thenReturn("a@b.com");
        when(jwt.getClaimAsString("scope")).thenReturn("   ");

        CurrentUser user = CurrentUser.fromJwt(jwt);

        assertThat(user.roles()).isEmpty();
    }

    @Test
    void fromJwtWithNullScopeReturnsEmptyRoles() {
        when(jwt.getSubject()).thenReturn("sub");
        when(jwt.getClaimAsString("userId")).thenReturn("uid");
        when(jwt.getClaimAsString("email")).thenReturn("a@b.com");
        when(jwt.getClaimAsString("scope")).thenReturn(null);

        CurrentUser user = CurrentUser.fromJwt(jwt);

        assertThat(user.roles()).isEmpty();
    }

    @Test
    void hasRoleReturnsTrueWhenPresent() {
        CurrentUser user = new CurrentUser("u", null, null, Set.of("ADMIN", "USER"));

        assertThat(user.hasRole("ADMIN")).isTrue();
        assertThat(user.hasRole("USER")).isTrue();
        assertThat(user.hasRole("UNKNOWN")).isFalse();
    }

    @Test
    void isAdminReturnsTrueWhenRolePresent() {
        assertThat(new CurrentUser("u", null, null, Set.of("ADMIN")).isAdmin()).isTrue();
        assertThat(new CurrentUser("u", null, null, Set.of("USER")).isAdmin()).isFalse();
    }

    @Test
    void hasGlobalScopeForAdminCupResponsableDossier() {
        assertThat(new CurrentUser("u", null, null, Set.of("ADMIN")).hasGlobalScope()).isTrue();
        assertThat(new CurrentUser("u", null, null, Set.of("CUP")).hasGlobalScope()).isTrue();
        assertThat(new CurrentUser("u", null, null, Set.of("RESPONSABLE_DOSSIER")).hasGlobalScope()).isTrue();
        assertThat(new CurrentUser("u", null, null, Set.of("CHEF_DEPARTEMENT")).hasGlobalScope()).isFalse();
    }

    @Test
    void isDepartmentScopedOnlyForChefWithoutGlobal() {
        assertThat(new CurrentUser("u", null, null, Set.of("CHEF_DEPARTEMENT")).isDepartmentScoped()).isTrue();
        assertThat(new CurrentUser("u", null, null, Set.of("ADMIN", "CHEF_DEPARTEMENT")).isDepartmentScoped()).isFalse();
        assertThat(new CurrentUser("u", null, null, Set.of("USER")).isDepartmentScoped()).isFalse();
    }
}
