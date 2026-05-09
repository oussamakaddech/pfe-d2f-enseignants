package esprit.pfe.auth.entities;

import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import java.util.HashSet;
import static org.junit.jupiter.api.Assertions.*;

class EntitiesTest {

    @Test
    void testUserEntity() {
        User user = new User("username", "first", "last", "123", "email@test.com", "pass");
        user.setId("id123");
        user.setDisabled(true);
        user.setRoles(new HashSet<>());
        user.setDeviceIds(new HashSet<>());

        assertEquals("username", user.getUsername());
        assertEquals("first", user.getFirstName());
        assertEquals("last", user.getLastName());
        assertEquals("123", user.getPhoneNumber());
        assertEquals("email@test.com", user.getEmail());
        assertEquals("pass", user.getPassword());
        assertEquals("id123", user.getId());
        assertTrue(user.getDisabled());
        assertNotNull(user.getRoles());
        assertNotNull(user.getDeviceIds());
        assertNotNull(user.toString());
        
        User user2 = new User("username", "first", "last", "123", "email@test.com", "pass");
        user2.setId("id123");
        user2.setDisabled(true);
        user2.setRoles(new HashSet<>());
        user2.setDeviceIds(new HashSet<>());
        assertEquals(user, user2);
        assertEquals(user.hashCode(), user2.hashCode());
    }

    @Test
    void testUserCustomMethods() {
        // Test secondary constructor
        User user = new User("customerName", "customer@email.com");
        assertEquals("customerName", user.getUsername());
        assertEquals("customer@email.com", user.getEmail());

        // Test ensureId
        assertNull(user.getId());
        user.ensureId();
        assertNotNull(user.getId());
        
        // Test ensureId when already set
        String existingId = "fixed-id";
        user.setId(existingId);
        user.ensureId();
        assertEquals(existingId, user.getId());

        // Test getUserRole
        Role role = new Role(ERole.ADMIN);
        user.getRoles().add(role);
        assertEquals("ADMIN", user.getUserRole());
    }

    @Test
    void testRoleEntity() {
        Role role = new Role(ERole.ADMIN);
        role.setId(1);
        assertEquals(ERole.ADMIN, role.getName());
        assertEquals(1, role.getId());
        
        Role role2 = new Role(ERole.ADMIN);
        role2.setId(1);
        assertEquals(role, role2);
    }

    @Test
    void testAuditLogEntity() {
        LocalDateTime now = LocalDateTime.now();
        AuditLog log = AuditLog.builder()
                .id(1L)
                .username("user")
                .action("LOGIN")
                .resource("Auth")
                .status("SUCCESS")
                .details("Details")
                .ipAddress("127.0.0.1")
                .timestamp(now)
                .build();

        assertEquals(1L, log.getId());
        assertEquals("user", log.getUsername());
        assertEquals("LOGIN", log.getAction());
        assertEquals("Auth", log.getResource());
        assertEquals("SUCCESS", log.getStatus());
        assertEquals("Details", log.getDetails());
        assertEquals("127.0.0.1", log.getIpAddress());
        assertEquals(now, log.getTimestamp());
        assertNotNull(log.toString());

        // Test custom method getActionDescription
        log.setAction("LOGIN");
        assertEquals("User logged in", log.getActionDescription());
        log.setAction("LOGOUT");
        assertEquals("User logged out", log.getActionDescription());
        log.setAction("LOGIN_FAILED");
        assertEquals("Login failed", log.getActionDescription());
        log.setAction("CREATE");
        assertEquals("Resource created", log.getActionDescription());
        log.setAction("UPDATE");
        assertEquals("Resource updated", log.getActionDescription());
        log.setAction("DELETE");
        assertEquals("Resource deleted", log.getActionDescription());
        log.setAction("UNAUTHORIZED_ACCESS");
        assertEquals("Unauthorized access attempt", log.getActionDescription());
        log.setAction("UNKNOWN_ACTION");
        assertEquals("UNKNOWN_ACTION", log.getActionDescription());
    }

    @Test
    void testAccountStatusStats() {
        AccountStatusStats stats = new AccountStatusStats(10L, 20L);
        assertEquals(10L, stats.disable());
        assertEquals(20L, stats.enable());
        assertNotNull(stats.toString());
    }
}
