package esprit.pfe.auth.security;

import esprit.pfe.auth.payload.response.JwtResponse;
import esprit.pfe.auth.payload.response.MessageResponse;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SecurityComponentsTest {

    @Test
    void testJwtResponse() {
        JwtResponse response = new JwtResponse("token", 1L, "user", "email", List.of("ROLE_ADMIN"));
        assertEquals("token", response.getAccessToken());
        assertEquals("Bearer", response.getTokenType());
        assertEquals(1L, response.getId());
        assertEquals("user", response.getUsername());
        assertEquals("email", response.getEmail());
        assertEquals(1, response.getRoles().size());
        
        response.setAccessToken("new-token");
        assertEquals("new-token", response.getAccessToken());
    }

    @Test
    void testMessageResponse() {
        MessageResponse response = new MessageResponse("Hello");
        assertEquals("Hello", response.getMessage());
        response.setMessage("World");
        assertEquals("World", response.getMessage());
    }
}
