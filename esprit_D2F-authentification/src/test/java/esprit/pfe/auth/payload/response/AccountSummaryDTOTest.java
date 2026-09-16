package esprit.pfe.auth.payload.response;

import esprit.pfe.auth.entities.ERole;
import esprit.pfe.auth.entities.Role;
import esprit.pfe.auth.entities.User;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class AccountSummaryDTOTest {

    private User makeUser(Boolean disabled, Set<Role> roles) {
        User u = new User();
        u.setId("uid1");
        u.setUsername("jdoe");
        u.setEmail("j@doe.com");
        u.setFirstName("John");
        u.setLastName("Doe");
        u.setDisabled(disabled);
        u.setRoles(roles);
        return u;
    }

    @Test
    void from_UserWithRole_MapsAllFields() {
        Role role = new Role(ERole.ENSEIGNANT);
        User user = makeUser(false, Set.of(role));

        AccountSummaryDTO dto = AccountSummaryDTO.from(user);

        assertEquals("uid1",       dto.getUserId());
        assertEquals("jdoe",       dto.getUsername());
        assertEquals("j@doe.com",  dto.getEmail());
        assertEquals("John",       dto.getFirstName());
        assertEquals("Doe",        dto.getLastName());
        assertEquals("ENSEIGNANT", dto.getRole());
        assertTrue(dto.isActive());
    }

    @Test
    void from_NullRoles_RoleIsNull() {
        User user = makeUser(false, null);
        AccountSummaryDTO dto = AccountSummaryDTO.from(user);
        assertNull(dto.getRole());
        assertTrue(dto.isActive());
    }

    @Test
    void from_EmptyRoles_RoleIsNull() {
        User user = makeUser(false, Set.of());
        AccountSummaryDTO dto = AccountSummaryDTO.from(user);
        assertNull(dto.getRole());
    }

    @Test
    void from_DisabledTrue_ActiveFalse() {
        User user = makeUser(true, Set.of(new Role(ERole.ADMIN)));
        assertFalse(AccountSummaryDTO.from(user).isActive());
    }

    @Test
    void from_DisabledFalse_ActiveTrue() {
        User user = makeUser(false, Set.of());
        assertTrue(AccountSummaryDTO.from(user).isActive());
    }

    @Test
    void from_DisabledNull_ActiveTrue() {
        User user = makeUser(null, Set.of());
        assertTrue(AccountSummaryDTO.from(user).isActive());
    }

    @Test
    void builder_CreatesCorrectInstance() {
        AccountSummaryDTO dto = AccountSummaryDTO.builder()
                .userId("u1").username("alice").email("alice@test.com")
                .firstName("Alice").lastName("Test").role("ADMIN").active(true)
                .build();

        assertEquals("u1",    dto.getUserId());
        assertEquals("alice", dto.getUsername());
        assertEquals("ADMIN", dto.getRole());
        assertTrue(dto.isActive());
    }

    @Test
    void noArgsConstructorAndSetters_Work() {
        AccountSummaryDTO dto = new AccountSummaryDTO();
        dto.setUserId("u2");
        dto.setUsername("bob");
        dto.setEmail("bob@test.com");
        dto.setFirstName("Bob");
        dto.setLastName("Builder");
        dto.setRole("CUP");
        dto.setActive(false);

        assertEquals("u2",             dto.getUserId());
        assertEquals("bob",            dto.getUsername());
        assertEquals("bob@test.com",   dto.getEmail());
        assertEquals("Bob",            dto.getFirstName());
        assertEquals("Builder",        dto.getLastName());
        assertEquals("CUP",            dto.getRole());
        assertFalse(dto.isActive());
    }

    @Test
    void allArgsConstructor_Works() {
        AccountSummaryDTO dto = new AccountSummaryDTO("id", "user", "e@mail.com", "F", "L", "ADMIN", true);
        assertEquals("id",    dto.getUserId());
        assertEquals("user",  dto.getUsername());
        assertTrue(dto.isActive());
    }
}
