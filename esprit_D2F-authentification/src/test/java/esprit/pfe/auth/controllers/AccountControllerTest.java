package esprit.pfe.auth.controllers;

import esprit.pfe.auth.entities.User;
import esprit.pfe.auth.payload.request.EditProfileRequest;
import esprit.pfe.auth.payload.request.UpdatePasswordRequest;
import esprit.pfe.auth.services.AccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.security.Principal;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountControllerTest {

    @Mock
    private AccountService accountService;
    @InjectMocks
    private AccountController controller;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId("user-1");
        testUser.setUsername("testuser");
        testUser.setEmail("test@esprit.tn");
        testUser.setFirstName("Test");
        testUser.setLastName("User");
        testUser.setRoles(Collections.emptySet());
    }

    @Test
    void listAccounts_shouldReturnUserDTOList() {
        when(accountService.listAccounts()).thenReturn(List.of(testUser));

        var result = controller.listAccounts();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("testuser", result.get(0).getUserName());
    }

    @Test
    void banAccounts_shouldDelegateToBan() {
        controller.banAccounts("testuser");
        verify(accountService).banAccount("testuser");
    }

    @Test
    void enableAccounts_shouldDelegateToEnable() {
        controller.enableAccounts("testuser");
        verify(accountService).enableAccount("testuser");
    }

    @Test
    void getPrincipal_shouldReturnUserDTO() {
        Principal principal = mock(Principal.class);
        when(principal.getName()).thenReturn("testuser");
        when(accountService.getPrincipal("testuser")).thenReturn(testUser);

        var result = controller.getPrincipal(principal);

        assertNotNull(result);
        assertEquals("testuser", result.getUserName());
    }

    @Test
    void editProfile_shouldReturnSuccessMessage() {
        Principal principal = mock(Principal.class);
        when(principal.getName()).thenReturn("testuser");
        EditProfileRequest request = new EditProfileRequest();
        when(accountService.editProfile("testuser", request)).thenReturn("Profile updated");

        String result = controller.editProfile(principal, request);

        assertEquals("Profile updated", result);
    }

    @Test
    void updatePassword_shouldReturnSuccessMessage() {
        Principal principal = mock(Principal.class);
        when(principal.getName()).thenReturn("testuser");
        UpdatePasswordRequest request = new UpdatePasswordRequest();
        when(accountService.updatePassword("testuser", request)).thenReturn("Password updated");

        String result = controller.updatePassword(principal, request);

        assertEquals("Password updated", result);
    }

    @Test
    void getPrincipalByUsername_shouldReturnUserDTO() {
        when(accountService.getPrincipalByUsername("testuser")).thenReturn(testUser);

        var result = controller.getPrincipalByUsername("testuser");

        assertEquals("test@esprit.tn", result.getEmail());
    }

    @Test
    void deleteAccount_shouldDelegate() {
        controller.deleteAccount("user-1");
        verify(accountService).deleteAccount("user-1");
    }

    @Test
    void updateAccount_shouldReturnUpdatedDTO() {
        EditProfileRequest request = new EditProfileRequest();
        when(accountService.updateAccount("user-1", request, "ROLE_ADMIN")).thenReturn(testUser);

        var result = controller.updateAccount("user-1", request, "ROLE_ADMIN");

        assertNotNull(result);
        assertEquals("testuser", result.getUserName());
    }
}
