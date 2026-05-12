package esprit.pfe.auth.controllers;

import esprit.pfe.auth.entities.ERole;
import esprit.pfe.auth.entities.Role;
import esprit.pfe.auth.entities.User;
import esprit.pfe.auth.services.AccountService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AccountController.class)
@AutoConfigureMockMvc(addFilters = false)
class AccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AccountService accountService;

    @Test
    void listAccounts_ShouldReturnOk() throws Exception {
        when(accountService.listAccounts(any(Pageable.class))).thenReturn(Page.empty());
        mockMvc.perform(get("/api/v1/account/list-accounts"))
                .andExpect(status().isOk());
    }

    @Test
    void banAccount_ShouldReturnOk() throws Exception {
        mockMvc.perform(post("/api/v1/account/ban-account")
                .param("userName", "testuser"))
                .andExpect(status().isOk());
    }

    @Test
    void enableAccount_ShouldReturnOk() throws Exception {
        mockMvc.perform(post("/api/v1/account/enable-account")
                .param("userName", "testuser"))
                .andExpect(status().isOk());
    }

    @Test
    void getProfile_ShouldReturnOk() throws Exception {
        User user = new User();
        user.setUsername("testuser");
        user.setRoles(Set.of(new Role(ERole.ADMIN)));
        when(accountService.getPrincipal("testuser")).thenReturn(user);

        mockMvc.perform(get("/api/v1/account/profile")
                .principal(() -> "testuser"))
                .andExpect(status().isOk());
    }

    @Test
    void editProfile_ShouldReturnOk() throws Exception {
        when(accountService.editProfile(eq("testuser"), any())).thenReturn("Updated");
        mockMvc.perform(post("/api/v1/account/edit-profile")
                .principal(() -> "testuser")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isOk());
    }

    @Test
    void updatePassword_ShouldReturnOk() throws Exception {
        when(accountService.updatePassword(eq("testuser"), any())).thenReturn("Updated");
        mockMvc.perform(post("/api/v1/account/update-password")
                .principal(() -> "testuser")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isOk());
    }

    @Test
    void deleteAccount_ShouldReturnOk() throws Exception {
        mockMvc.perform(delete("/api/v1/account/delete/id123"))
                .andExpect(status().isOk());
    }

    @Test
    void updateAccount_ShouldReturnOk() throws Exception {
        User user = new User();
        user.setUsername("testuser");
        user.setRoles(Set.of(new Role(ERole.ADMIN)));
        when(accountService.updateAccount(eq("id123"), any(), any())).thenReturn(user);

        mockMvc.perform(put("/api/v1/account/update/id123")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isOk());
    }
}
