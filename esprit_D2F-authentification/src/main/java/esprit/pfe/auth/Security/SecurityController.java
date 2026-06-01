package esprit.pfe.auth.security;

import esprit.pfe.auth.payload.request.SignupRequest;
import esprit.pfe.auth.payload.response.MessageResponse;
import esprit.pfe.auth.services.AuthService;
import esprit.pfe.auth.services.AuthService.JwtSession;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Adaptateur HTTP de l'authentification (DSI #5).
 *
 * <p>La logique métier (login + anti brute-force, inscription, reset mot de passe,
 * refresh, reset appareils, émission JWT) a été extraite dans {@link AuthService}.
 * Ce contrôleur ne fait que : lire la requête (IP, paramètres), déléguer au service,
 * et construire la réponse HTTP (cookies HttpOnly, ResponseEntity).
 */
@RestController
@RequestMapping("/api/v1/auth")
@Slf4j
@io.swagger.v3.oas.annotations.tags.Tag(
        name = "Authentification",
        description = "Login, signup, reset password, JWT issuance. Endpoints publics sauf /me."
)
public class SecurityController {

    private static final String COOKIE_NAME = "d2f_auth_token";

    private final AuthService authService;

    @Value("${app.cookie.secure:true}")
    private boolean cookieSecure;

    public SecurityController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/reset-password")
    public String resetPassword(@RequestParam String token, @RequestParam String newPassword,
            HttpServletRequest request) {
        return authService.resetPassword(token, newPassword, extractClientIp(request));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@RequestParam String emailAddress,
            HttpServletRequest request) {
        authService.forgotPassword(emailAddress, extractClientIp(request));
        return ResponseEntity.ok(new MessageResponse(AuthService.PASSWORD_RESET_GENERIC_MESSAGE));
    }

    @GetMapping("/profile")
    public Authentication authentication(Authentication authentication) {
        return authentication;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestParam String username, @RequestParam String password,
            HttpServletRequest request, HttpServletResponse response) {
        JwtSession session = authService.login(username, password, extractClientIp(request));
        response.addHeader(HttpHeaders.SET_COOKIE, buildJwtCookie(session.token(), session.maxAgeSeconds()).toString());
        return ResponseEntity.ok(session.body());
    }

    @GetMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refreshToken(Authentication authentication,
            HttpServletResponse response) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        JwtSession session = authService.refresh(authentication);
        response.addHeader(HttpHeaders.SET_COOKIE, buildJwtCookie(session.token(), session.maxAgeSeconds()).toString());
        return ResponseEntity.ok(session.body());
    }

    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, buildExpiredCookie().toString());
        return ResponseEntity.ok(new MessageResponse("Logged out successfully"));
    }

    @PostMapping("/request-reset")
    public ResponseEntity<MessageResponse> requestDeviceReset(@RequestParam String username) {
        authService.requestDeviceReset(username);
        return ResponseEntity.ok(new MessageResponse("Device reset request has been sent."));
    }

    @PostMapping("/reset-devices")
    @PreAuthorize("hasAnyRole('ADMIN', 'D2F')")
    public ResponseEntity<MessageResponse> resetDevices(@RequestParam String username) {
        authService.resetDevices(username);
        return ResponseEntity.ok(new MessageResponse("Device IDs have been reset."));
    }

    @PostMapping("/signup")
    public ResponseEntity<MessageResponse> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        authService.registerUser(signUpRequest);
        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }

    // ── Helpers HTTP (cookies, IP) ──────────────────────────────────────────────

    /** Cookie HttpOnly + Secure + SameSite=Strict portant le JWT. */
    private ResponseCookie buildJwtCookie(String jwt, long maxAgeSeconds) {
        return ResponseCookie.from(COOKIE_NAME, jwt)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/")
                .maxAge(maxAgeSeconds)
                .build();
    }

    /** Cookie expiré pour invalider le JWT (logout). */
    private ResponseCookie buildExpiredCookie() {
        return ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/")
                .maxAge(0)
                .build();
    }

    /** IP du client, en tenant compte du header X-Forwarded-For injecté par la gateway. */
    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
