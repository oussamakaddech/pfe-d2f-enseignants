package esprit.pfe.auth.controllers;

import esprit.pfe.auth.entities.User;
import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.auth.security.PiiSafeLogger;
import esprit.pfe.auth.services.AccountService;
import esprit.pfe.auth.services.AuditService;
import esprit.pfe.auth.payload.request.AccountSummaryQuery;
import esprit.pfe.auth.payload.request.EditProfileRequest;
import esprit.pfe.auth.payload.request.SignupRequest;
import esprit.pfe.auth.payload.request.UpdatePasswordRequest;
import esprit.pfe.auth.payload.response.AccountSummaryDTO;
import esprit.pfe.auth.payload.response.UserDTO;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/account")
public class AccountController {
    private static final String SYSTEM_USER = "system";
    private static final String LOG_ACCOUNT_PREFIX = "Account ";
    private static final String LOG_FROM_IP = " from IP ";

    private final AccountService accountService;
    private final AuditService auditService;

    public AccountController(AccountService accountService, AuditService auditService) {
        this.accountService = accountService;
        this.auditService = auditService;
    }

    @GetMapping("/list-accounts")
    @PreAuthorize(AuthorizationMatrix.ACCOUNT_READ)
    public Page<UserDTO> listAccounts(@PageableDefault(size = 500) Pageable pageable) {
        return this.accountService.listAccounts(pageable).map(UserDTO::new);
    }

    /**
     * Résumés de comptes (sans secret) pour la page de gestion unifiée.
     * Endpoint inter-service : appelé par le service formation (jeton de service
     * ROLE_SVC_FORMATION) pour enrichir/filtrer les profils unifiés par rôle et
     * statut d'activation. Reste accessible aux rôles d'administration unifiée.
     */
    @PostMapping("/summaries")
    @PreAuthorize(AuthorizationMatrix.ACCOUNT_SUMMARY_READ)
    @Operation(summary = "Résumés de comptes (userIds / rôle / actif) — sans données sensibles")
    public List<AccountSummaryDTO> getAccountSummaries(
            @RequestBody(required = false) AccountSummaryQuery query) {
        return this.accountService.getAccountSummaries(query);
    }

    /**
     * Création d'un compte par un administrateur, avec rôle explicite
     * (ADMIN, CUP, FORMATEUR/ANIMATEUR, …). Pendant sécurisé de l'auto-inscription
     * publique : ici le rôle est honoré car l'appelant est authentifié ADMIN
     * (ACCOUNT_CREATE). Le rôle passe en paramètre, pas dans le corps.
     */
    @PostMapping("/create-account")
    @PreAuthorize(AuthorizationMatrix.ACCOUNT_CREATE)
    public ResponseEntity<UserDTO> createAccount(
            @Valid @RequestBody SignupRequest request,
            @RequestParam(required = false) String role,
            Principal principal,
            HttpServletRequest httpRequest) {
        UserDTO created = new UserDTO(this.accountService.createAccount(request, role));
        String adminUsername = principal != null ? principal.getName() : SYSTEM_USER;
        PiiSafeLogger.info(AccountController.class,
                LOG_ACCOUNT_PREFIX + request.getUsername() + " (role=" + role + ") created by "
                        + adminUsername + LOG_FROM_IP + extractClientIp(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/ban-account")
    @PreAuthorize(AuthorizationMatrix.ACCOUNT_BAN)
    public void banAccounts(@RequestParam String userName, Principal principal,
                            HttpServletRequest request) {
        this.accountService.banAccount(userName);

        // Audit : ACCOUNT_BAN
        String adminUsername = principal != null ? principal.getName() : SYSTEM_USER;
        String ip = extractClientIp(request);
        auditService.logAccountBan(adminUsername, userName, ip);
        PiiSafeLogger.info(AccountController.class,
                LOG_ACCOUNT_PREFIX + userName + " banned by " + adminUsername + LOG_FROM_IP + ip);
    }

    @PostMapping("/enable-account")
    @PreAuthorize(AuthorizationMatrix.ACCOUNT_BAN)
    public void enableAccounts(@RequestParam String userName, Principal principal,
                               HttpServletRequest request) {
        this.accountService.enableAccount(userName);

        // Audit : ACCOUNT_ENABLE
        String adminUsername = principal != null ? principal.getName() : SYSTEM_USER;
        String ip = extractClientIp(request);
        auditService.logAccountEnable(adminUsername, userName, ip);
        PiiSafeLogger.info(AccountController.class,
                LOG_ACCOUNT_PREFIX + userName + " enabled by " + adminUsername + LOG_FROM_IP + ip);
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
