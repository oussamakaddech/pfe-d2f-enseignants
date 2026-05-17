package esprit.pfe.auth.payload.response;

import esprit.pfe.auth.entities.ERole;
import esprit.pfe.auth.entities.Role;
import esprit.pfe.auth.entities.User;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;

class ResponsePayloadsTest {

    @Test
    void testUserDTOWithUser() {
        User user = new User();
        user.setId("id1");
        user.setUsername("user1");
        user.setFirstName("First");
        user.setLastName("Last");
        user.setPhoneNumber("123");
        user.setEmail("email");
        user.setDisabled(true);
        user.setRoles(Set.of(new Role(ERole.ADMIN)));

        UserDTO dto = new UserDTO(user);
        assertEquals("id1", dto.getId());
        assertEquals("user1", dto.getUserName());
        assertEquals("First", dto.getFirsName());
        assertEquals("Last", dto.getLastName());
        assertEquals("123", dto.getPhoneNumber());
        assertEquals("email", dto.getEmail());
        assertEquals("ADMIN", dto.getRole());
        assertTrue(dto.getStatus());
    }

    @Test
    void testUserDTOWithoutRoles() {
        User user = new User();
        user.setRoles(null);
        UserDTO dto = new UserDTO(user);
        assertEquals("USER", dto.getRole());
    }

    @Test
    void testJwtResponseGettersAndSetters() {
        JwtResponse response = new JwtResponse("token123", 1L, "user1", "user1@test.com", List.of("ADMIN"));

        assertEquals("token123", response.getAccessToken());
        assertEquals("Bearer", response.getTokenType());
        assertEquals(1L, response.getId());
        assertEquals("user1", response.getUsername());
        assertEquals("user1@test.com", response.getEmail());
        assertEquals(List.of("ADMIN"), response.getRoles());

        response.setAccessToken("newtoken");
        assertEquals("newtoken", response.getAccessToken());

        response.setTokenType("Custom");
        assertEquals("Custom", response.getTokenType());

        response.setId(2L);
        assertEquals(2L, response.getId());

        response.setEmail("new@test.com");
        assertEquals("new@test.com", response.getEmail());

        response.setUsername("newuser");
        assertEquals("newuser", response.getUsername());
    }
}
