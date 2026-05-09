package esprit.pfe.auth.payload.request;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PayloadsTest {

    @Test
    void testEditProfileRequest() {
        EditProfileRequest request = new EditProfileRequest();
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setEmail("john@example.com");
        request.setPhoneNumber("12345678");

        assertEquals("John", request.getFirstName());
        assertEquals("Doe", request.getLastName());
        assertEquals("john@example.com", request.getEmail());
        assertEquals("12345678", request.getPhoneNumber());
        assertNotNull(request.toString());
    }

    @Test
    void testUpdatePasswordRequest() {
        UpdatePasswordRequest request = new UpdatePasswordRequest();
        request.setNewPassword("pass1");
        request.setConfirmation("pass1");

        assertEquals("pass1", request.getNewPassword());
        assertEquals("pass1", request.getConfirmation());
        assertNotNull(request.toString());
    }

    @Test
    void testSignupRequest() {
        SignupRequest request = new SignupRequest();
        request.setId("id1");
        request.setUsername("user1");
        request.setFirstName("First");
        request.setLastName("Last");
        request.setPhoneNumber("123");
        request.setEmail("user1@example.com");
        request.setPassword("pass1");
        request.setRole("admin");

        assertEquals("id1", request.getId());
        assertEquals("user1", request.getUsername());
        assertEquals("First", request.getFirstName());
        assertEquals("Last", request.getLastName());
        assertEquals("123", request.getPhoneNumber());
        assertEquals("user1@example.com", request.getEmail());
        assertEquals("pass1", request.getPassword());
        assertEquals("admin", request.getRole());
        assertNotNull(request.toString());
    }

    @Test
    void testUpdateTrainingRequest() {
        UpdateTrainingRequest request = new UpdateTrainingRequest();
        request.setName("New Name");
        request.setDescription("New Description");
        request.setCoachName("New Coach");
        
        assertEquals("New Name", request.getName());
        assertEquals("New Description", request.getDescription());
        assertEquals("New Coach", request.getCoachName());
        assertNotNull(request.toString());
    }
}
