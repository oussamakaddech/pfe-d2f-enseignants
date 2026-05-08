package esprit.pfe.auth.services;

import esprit.pfe.auth.entities.User;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

class UserDetailsImplTest {

    @Test
    void build_shouldCreateUserDetailsFromUser() {
        User user = new User();
        user.setId("user-123");
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setPassword("encoded-password");
        user.setRoles(Collections.emptySet());

        UserDetailsImpl details = UserDetailsImpl.build(user);

        assertEquals("user-123", details.getId());
        assertEquals("testuser", details.getUsername());
        assertEquals("test@example.com", details.getEmail());
        assertEquals("encoded-password", details.getPassword());
        assertNotNull(details.getAuthorities());
    }

    @Test
    void isAccountNonExpired_shouldReturnTrue() {
        User user = new User();
        user.setId("1");
        user.setUsername("u");
        user.setEmail("e");
        user.setPassword("p");
        user.setRoles(Collections.emptySet());

        UserDetailsImpl details = UserDetailsImpl.build(user);

        assertTrue(details.isAccountNonExpired());
        assertTrue(details.isAccountNonLocked());
        assertTrue(details.isCredentialsNonExpired());
        assertTrue(details.isEnabled());
    }

    @Test
    void equals_sameId_shouldBeEqual() {
        User user1 = new User();
        user1.setId("same-id");
        user1.setUsername("u1");
        user1.setEmail("e1");
        user1.setPassword("p1");
        user1.setRoles(Collections.emptySet());

        User user2 = new User();
        user2.setId("same-id");
        user2.setUsername("u2");
        user2.setEmail("e2");
        user2.setPassword("p2");
        user2.setRoles(Collections.emptySet());

        UserDetailsImpl d1 = UserDetailsImpl.build(user1);
        UserDetailsImpl d2 = UserDetailsImpl.build(user2);

        assertEquals(d1, d2);
    }

    @Test
    void equals_differentId_shouldNotBeEqual() {
        User user1 = new User();
        user1.setId("id-1");
        user1.setUsername("u1");
        user1.setEmail("e1");
        user1.setPassword("p1");
        user1.setRoles(Collections.emptySet());

        User user2 = new User();
        user2.setId("id-2");
        user2.setUsername("u2");
        user2.setEmail("e2");
        user2.setPassword("p2");
        user2.setRoles(Collections.emptySet());

        UserDetailsImpl d1 = UserDetailsImpl.build(user1);
        UserDetailsImpl d2 = UserDetailsImpl.build(user2);

        assertNotEquals(d1, d2);
    }
}
