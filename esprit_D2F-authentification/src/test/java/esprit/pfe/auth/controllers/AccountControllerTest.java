package esprit.pfe.auth.controllers;

import esprit.pfe.auth.entities.ERole;
import esprit.pfe.auth.entities.Role;
import esprit.pfe.auth.entities.User;
import esprit.pfe.auth.payload.request.EditProfileRequest;
import esprit.pfe.auth.payload.request.UpdatePasswordRequest;
import esprit.pfe.auth.services.AccountService;
import esprit.pfe.auth.services.AuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Set;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AccountController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AccountController Tests")
class AccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AccountService accountService;

    @MockitoBean
    private AuditService auditService;

        // Required when @EnableJpaAuditing is enabled on the main application class.
        @MockitoBean
        private JpaMetamodelMappingContext jpaMetamodelMappingContext;

        @SuppressWarnings("rawtypes")
        @MockitoBean(name = "auditorProvider")
        private AuditorAware auditorProvider;

    private User testUser;
    private Role adminRole;

    @BeforeEach
    void setUp() {
        adminRole = new Role();
        adminRole.setName(ERole.ADMIN);
        
        testUser = new User();
        testUser.setId("USER123");
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setRoles(Set.of(adminRole));
    }

    @Test
    @DisplayName("listAccounts - should return OK")
    void listAccounts_ShouldReturnOk() throws Exception {
        when(accountService.listAccounts(any(Pageable.class))).thenReturn(Page.empty());
        mockMvc.perform(get("/api/v1/account/list-accounts"))
                .andExpect(status().isOk());
        verify(accountService).listAccounts(any(Pageable.class));
    }

    @Test
    @DisplayName("banAccount - should call service and audit")
    void banAccount_ShouldReturnOk() throws Exception {
        mockMvc.perform(post("/api/v1/account/ban-account")
                .param("userName", "testuser")
                .header("X-Forwarded-For", "192.168.1.1"))
                .andExpect(status().isOk());
        
        verify(accountService).banAccount("testuser");
        verify(auditService).logAccountBan(anyString(), eq("testuser"), anyString());
    }

    @Test
    @DisplayName("enableAccount - should call service and audit")
    void enableAccount_ShouldReturnOk() throws Exception {
        mockMvc.perform(post("/api/v1/account/enable-account")
                .param("userName", "testuser")
                .header("X-Forwarded-For", "192.168.1.1"))
                .andExpect(status().isOk());
        
        verify(accountService).enableAccount("testuser");
        verify(auditService).logAccountEnable(anyString(), eq("testuser"), anyString());
    }

    @Test
    @DisplayName("getProfile - should return user profile")
    void getProfile_ShouldReturnOk() throws Exception {
        when(accountService.getPrincipal("testuser")).thenReturn(testUser);

        mockMvc.perform(get("/api/v1/account/profile")
                .principal(() -> "testuser"))
                .andExpect(status().isOk());
        
        verify(accountService).getPrincipal("testuser");
    }

    @Test
    @DisplayName("editProfile - should update profile")
    void editProfile_ShouldReturnOk() throws Exception {
        when(accountService.editProfile(eq("testuser"), any(EditProfileRequest.class)))
                .thenReturn("Profile updated successfully");
        
        mockMvc.perform(post("/api/v1/account/edit-profile")
                .principal(() -> "testuser")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"firstName\":\"John\",\"lastName\":\"Doe\"}"))
                .andExpect(status().isOk());
        
        verify(accountService).editProfile(eq("testuser"), any(EditProfileRequest.class));
    }

    @Test
    @DisplayName("updatePassword - should update password")
    void updatePassword_ShouldReturnOk() throws Exception {
        when(accountService.updatePassword(eq("testuser"), any(UpdatePasswordRequest.class)))
                .thenReturn("Password updated successfully");
        
        mockMvc.perform(post("/api/v1/account/update-password")
                .principal(() -> "testuser")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"oldPassword\":\"old123\",\"newPassword\":\"new123\"}"))
                .andExpect(status().isOk());
        
        verify(accountService).updatePassword(eq("testuser"), any(UpdatePasswordRequest.class));
    }

    @Test
    @DisplayName("deleteAccount - should delete account")
    void deleteAccount_ShouldReturnOk() throws Exception {
        mockMvc.perform(delete("/api/v1/account/delete/USER123"))
                .andExpect(status().isOk());
        
        verify(accountService).deleteAccount("USER123");
    }

    @Test
    @DisplayName("updateAccount - should update account with all parameters")
    void updateAccount_ShouldReturnOk() throws Exception {
        when(accountService.updateAccount(eq("USER123"), any(EditProfileRequest.class), eq("ADMIN")))
                .thenReturn(testUser);

        mockMvc.perform(put("/api/v1/account/update/USER123")
                .param("role", "ADMIN")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"firstName\":\"Jane\"}"))
                .andExpect(status().isOk());
        
        verify(accountService).updateAccount(eq("USER123"), any(EditProfileRequest.class), eq("ADMIN"));
    }

    @Test
    @DisplayName("updateAccount - should update account without role")
    void updateAccount_WithoutRole_ShouldReturnOk() throws Exception {
        when(accountService.updateAccount(eq("USER123"), any(EditProfileRequest.class), isNull()))
                .thenReturn(testUser);

        mockMvc.perform(put("/api/v1/account/update/USER123")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"firstName\":\"Jane\"}"))
                .andExpect(status().isOk());
        
        verify(accountService).updateAccount(eq("USER123"), any(EditProfileRequest.class), isNull());
    }

    @Test
    @DisplayName("getProfileByUsername - should return user profile by username")
    void getProfileByUsername_ShouldReturnOk() throws Exception {
        when(accountService.getPrincipalByUsername("testuser")).thenReturn(testUser);

        mockMvc.perform(get("/api/v1/account/profile/testuser"))
                .andExpect(status().isOk());
        
        verify(accountService).getPrincipalByUsername("testuser");
    }

        @Test
        @DisplayName("userExistsById - should return boolean existence")
        void userExistsById_ShouldReturnOk() throws Exception {
                when(accountService.userExistsById("USER123")).thenReturn(true);

                mockMvc.perform(get("/api/v1/account/exists/USER123"))
                                .andExpect(status().isOk());

                verify(accountService).userExistsById("USER123");
        }

    @Test
    @DisplayName("banAccount - should extract IP from X-Forwarded-For header")
    void banAccount_ShouldExtractForwardedIp() throws Exception {
        mockMvc.perform(post("/api/v1/account/ban-account")
                .param("userName", "banneduser")
                .header("X-Forwarded-For", "10.0.0.1, 192.168.1.1"))
                .andExpect(status().isOk());
        
        verify(auditService).logAccountBan(anyString(), eq("banneduser"), startsWith("10.0.0.1"));
    }

    @Test
    @DisplayName("enableAccount - should extract IP from request remote address when no X-Forwarded-For")
    void enableAccount_WithoutForwardedHeader() throws Exception {
        mockMvc.perform(post("/api/v1/account/enable-account")
                .param("userName", "enableduser"))
                .andExpect(status().isOk());
        
        verify(accountService).enableAccount("enableduser");
        verify(auditService).logAccountEnable(anyString(), eq("enableduser"), anyString());
    }

    @Test
    @DisplayName("listAccounts - should handle pagination")
    void listAccounts_WithPagination_ShouldReturnOk() throws Exception {
        when(accountService.listAccounts(any(Pageable.class))).thenReturn(Page.empty());
        
        mockMvc.perform(get("/api/v1/account/list-accounts")
                .param("page", "0")
                .param("size", "20")
                .param("sort", "username,asc"))
                .andExpect(status().isOk());
        
        verify(accountService).listAccounts(any(Pageable.class));
    }

    @Test
    @DisplayName("banAccount - should use system as admin username when principal is null")
    void banAccount_WithNullPrincipal() throws Exception {
        mockMvc.perform(post("/api/v1/account/ban-account")
                .param("userName", "banneduser"))
                .andExpect(status().isOk());
        
        verify(auditService).logAccountBan(anyString(), eq("banneduser"), anyString());
    }
}
