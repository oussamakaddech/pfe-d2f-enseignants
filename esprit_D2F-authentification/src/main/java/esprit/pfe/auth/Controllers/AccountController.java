package esprit.pfe.auth.controllers;

import esprit.pfe.auth.entities.User;
import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.auth.security.PiiSafeLogger;
import esprit.pfe.auth.services.AccountService;
import esprit.pfe.auth.services.AuditService;
import esprit.pfe.auth.payload.request.EditProfileRequest;
import esprit.pfe.auth.payload.request.UpdatePasswordRequest;
import esprit.pfe.auth.payload.response.UserDTO;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/account")
public class AccountController {
    private final AccountService accountService;
    private final AuditService auditService;

    public AccountController(AccountService accountService, AuditService auditService) {
        this.accountService = accountService;
        this.auditService = auditService;
    }

    @GetMapping("/list-accounts")
    @PreAuthorize(AuthorizationMatrix.ACCOUNT_READ)
    public Page<UserDTO> listAccounts(Pageable pageable) {
        return this.accountService.listAccounts(pageable).map(UserDTO::new);
    }

    @PostMapping("/ban-account")
    @PreAuthorize(AuthorizationMatrix.ACCOUNT_BAN)
    public void banAccounts(@RequestParam String userName, Principal principal,
                            HttpServletRequest request) {
        this.accountService.banAccount(userName);

        // Audit : ACCOUNT_BAN
        String adminUsername = principal != null ? principal.getName() : "system";
        String ip = extractClientIp(request);
        auditService.logAccountBan(adminUsername, userName, ip);
        PiiSafeLogger.info(AccountController.class,
                "Account " + userName + " banned by " + adminUsername + " from IP " + ip);
    }

    @PostMapping("/enable-account")
    @PreAuthorize(AuthorizationMatrix.ACCOUNT_BAN)
    public void enableAccounts(@RequestParam String userName, Principal principal,
                               HttpServletRequest request) {
        this.accountService.enableAccount(userName);

        // Audit : ACCOUNT_ENABLE
        String adminUsername = principal != null ? principal.getName() : "system";
        String ip = extractClientIp(request);
        auditService.logAccountEnable(adminUsername, userName, ip);
        PiiSafeLogger.info(AccountController.class,
                "Account " + userName + " enabled by " + adminUsername + " from IP " + ip);
    }

    @GetMapping("/profile")
    @PreAuthorize(AuthorizationMatrix.ACCOUNT_EDIT_OWN)
    public UserDTO getPrincipal(Principal principal) {
        return new UserDTO(this.accountService.getPrincipal(principal.getName()));
    }

    @PostMapping("/edit-profile")
    @PreAuthorize(AuthorizationMatrix.ACCOUNT_EDIT_OWN)
    public String editProfile(Principal principal, @RequestBody EditProfileRequest editProfileRequest) {
        return this.accountService.editProfile(principal.getName(), editProfileRequest);
    }

    @PostMapping("/update-password")
    @PreAuthorize(AuthorizationMatrix.ACCOUNT_EDIT_OWN)
    public String updatePassword(Principal principal, @RequestBody UpdatePasswordRequest updatePasswordRequest) {
        return this.accountService.updatePassword(principal.getName(), updatePasswordRequest);
    }

    @GetMapping("/profile/{username}")
    @PreAuthorize(AuthorizationMatrix.ACCOUNT_VIEW_PROFILE)
    public UserDTO getPrincipalByUsername(@PathVariable String username) {
        User user = this.accountService.getPrincipalByUsername(username);
        return new UserDTO(user);
    }

    @GetMapping("/exists/{userId}")
    @PreAuthorize(AuthorizationMatrix.ACCOUNT_VIEW_PROFILE)
    public boolean userExistsById(@PathVariable String userId) {
        return this.accountService.userExistsById(userId);
    }

    @DeleteMapping("/delete/{userId}")
    @PreAuthorize(AuthorizationMatrix.ACCOUNT_DELETE)
    public void deleteAccount(@PathVariable String userId) {
        this.accountService.deleteAccount(userId);
    }

    @PutMapping("/update/{userId}")
    @PreAuthorize(AuthorizationMatrix.ACCOUNT_UPDATE)
    public UserDTO updateAccount(
            @PathVariable String userId,
            @RequestBody EditProfileRequest editProfileRequest,
            @RequestParam(required = false) String role) {
        User updated = this.accountService.updateAccount(userId, editProfileRequest, role);
        return new UserDTO(updated);
    }

    /**
     * Extrait l'IP du client depuis la requête HTTP.
     * Prend en compte le header X-Forwarded-For injecté par l'API Gateway.
     */
    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

}
