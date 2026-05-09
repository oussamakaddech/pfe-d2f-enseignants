package esprit.pfe.auth.payload.response;

import esprit.pfe.auth.entities.ERole;
import esprit.pfe.auth.entities.Role;
import esprit.pfe.auth.entities.User;
import org.junit.jupiter.api.Test;
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
}
