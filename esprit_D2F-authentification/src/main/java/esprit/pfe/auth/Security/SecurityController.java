package esprit.pfe.auth.security;

import esprit.pfe.auth.entities.ConfirmationKey;
import esprit.pfe.auth.entities.ERole;
import esprit.pfe.auth.entities.Role;
import esprit.pfe.auth.entities.User;
import esprit.pfe.auth.repositories.ConfirmationKeyRepo;
import esprit.pfe.auth.repositories.RoleRepository;
import esprit.pfe.auth.repositories.UserRepository;
import esprit.pfe.auth.services.AuditService;
import esprit.pfe.auth.services.EmailService;
import esprit.pfe.auth.error.TokenExpiredException;

import esprit.pfe.auth.error.BadRequestException;
import esprit.pfe.auth.error.LoginException;
import esprit.pfe.auth.payload.request.SignupRequest;
import esprit.pfe.auth.payload.response.MessageResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;

@RestController
@RequestMapping("/api/v1/auth")
@Slf4j
public class SecurityController {
    private static final String LOG_MESSAGE_FORMAT = "Password reset successful for %s from IP %s";
    private static final String LOG_MESSAGE_FORMAT_2 = "Password reset requested for %s from IP %s";
    private static final String LOG_MESSAGE_FORMAT_3 = "Login attempt for username=%s from IP %s";
    private static final String LOG_MESSAGE_FORMAT_4 = "Login refused for username=%s from IP %s";
    private static final String LOG_MESSAGE_FORMAT_5 = "Login successful for username=%s from IP %s";
    private static final String EMAIL_KEY = "email";

    // Security dependencies
    private final EmailService emailService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtEncoder jwtEncoder;
    private final ConfirmationKeyRepo confirmationKeyRepo;
    private final PasswordEncoder encoder;
    private final AuditService auditService;

    @Value("${app.mail.from:noreply@d2f.local}")
    private String mailFrom;

    @Value("${app.admin.email:admin@d2f.local}")
    private String adminEmail;

    @Value("${app.cookie.secure:true}")
    private boolean cookieSecure;

    private static final String COOKIE_NAME = "d2f_auth_token";
    private static final int JWT_DURATION_MINUTES = 120;

    // Anti brute-force : N tentatives echouees consecutives => compte verrouille X
    @Value("${auth.lockout.max-attempts:5}")
    private int lockoutMaxAttempts;

    @Value("${auth.lockout.duration-minutes:15}")
    private int lockoutDurationMinutes;

    public SecurityController(
            EmailService emailService,
            UserRepository userRepository,
            RoleRepository roleRepository,
            AuthenticationManager authenticationManager,
            JwtEncoder jwtEncoder,
            ConfirmationKeyRepo confirmationKeyRepo,
            PasswordEncoder encoder,
            AuditService auditService) {
        this.emailService = emailService;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.authenticationManager = authenticationManager;
        this.jwtEncoder = jwtEncoder;
        this.confirmationKeyRepo = confirmationKeyRepo;
        this.encoder = encoder;
        this.auditService = auditService;
    }

    @PostMapping("/reset-password")
    public String resetPassword(@RequestParam String token, @RequestParam String newPassword,
            HttpServletRequest request) {
        // SECURITE : on hashe le token (SHA-256) cote serveur avant tout lookup BDD.
        // Le token clair n'existe que dans l'email envoye a l'utilisateur ;
        // la base ne stocke jamais le secret en clair.
        String tokenHash = hashConfirmationToken(token);
        this.checkIfTokenIsValid(tokenHash);
        String result = this.resetPasswordAndDeleteToken(tokenHash, newPassword);

        // Audit : PASSWORD_RESET_SUCCESS (recharge via hash pour recuperer l'email)
        ConfirmationKey key = this.confirmationKeyRepo.findByToken(tokenHash).orElse(null);
        String email = key != null ? key.getEmailAddress() : "unknown";
        String ip = extractClientIp(request);
        auditService.logPasswordResetSuccess(email, ip);
        PiiSafeLogger.info(SecurityController.class,
                String.format(LOG_MESSAGE_FORMAT, email, ip));

        return result;
    }

    /**
     * Hashe un token de confirmation avec SHA-256 (encodage hex minuscule).
     * Utilise comme cle de recherche en base, en remplacement du token brut.
     */
    static String hashConfirmationToken(String rawToken) {
        if (rawToken == null) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 est garanti par la specification de la JVM.
            throw new IllegalStateException("SHA-256 indisponible dans la JVM", e);
        }
    }

    /**
     * Verifie qu'un token (deja hashe) existe en base et n'est pas expire.
     * IMPORTANT : ce parametre est le HASH du token, jamais le token clair.
     */
    public void checkIfTokenIsValid(String tokenHash) {
        ConfirmationKey key = this.confirmationKeyRepo.findByToken(tokenHash)
                .orElseThrow(() -> new BadRequestException("Confirmation token invalid"));

        if (key.getExpiresAt().isBefore(LocalDateTime.now())) {
            this.confirmationKeyRepo.delete(key);
            throw new TokenExpiredException("Confirmation token has expired");
        }
    }

    /**
     * Reset le mot de passe via un token deja hashe et supprime l'entree de
     * confirmation.
     */
    public String resetPasswordAndDeleteToken(String tokenHash, String newPassword) {
        ConfirmationKey confirmationKey = this.confirmationKeyRepo.findByToken(tokenHash)
                .orElseThrow(() -> new BadRequestException("Confirmation token not found"));
        User user = this.userRepository.findByEmail(confirmationKey.getEmailAddress())
                .orElseThrow(() -> new BadRequestException("User associated with this token not found"));
        user.setPassword(this.encoder.encode(newPassword));
        this.userRepository.save(user);
        this.confirmationKeyRepo.delete(confirmationKey);
        return "Password changed";
    }

    @PostMapping("/forgot-password")
    public String forgotPassword(@RequestParam String emailAddress, HttpServletRequest request) {
        if (!userRepository.existsByEmail(emailAddress)) {
            throw new BadRequestException("Email address invalid");
        }
        if (confirmationKeyRepo.existsByEmailAddress(emailAddress)) {
            throw new BadRequestException("We have already sent an email to reset your password");
        }
        final var key = UUID.randomUUID().toString();
        SimpleMailMessage simpleMailMessage = new SimpleMailMessage();
        simpleMailMessage.setTo(emailAddress);
        simpleMailMessage.setSubject("Password reset");
        simpleMailMessage.setFrom(mailFrom);
        simpleMailMessage.setText("To change your password add this confirmation token: " + key);
        emailService.send(simpleMailMessage);

        // Audit : PASSWORD_RESET_REQUEST
        String ip = extractClientIp(request);
        auditService.logPasswordResetRequest(emailAddress, ip);
        PiiSafeLogger.info(SecurityController.class,
                String.format(LOG_MESSAGE_FORMAT_2, emailAddress, ip));

        return this.generateAndPersistToken(emailAddress, key);
    }

    public String generateAndPersistToken(String emailAddress, String key) {
        // SECURITE : on stocke uniquement le hash SHA-256 du token en base.
        // Le token clair (UUID) reste dans l'email envoye a l'utilisateur ;
        // en cas de fuite BDD, le token n'est pas reutilisable directement.
        ConfirmationKey confirmationKey = new ConfirmationKey();
        confirmationKey.setEmailAddress(emailAddress);
        confirmationKey.setToken(hashConfirmationToken(key));
        confirmationKey.setExpiresAt(LocalDateTime.now().plusMinutes(15));
        this.confirmationKeyRepo.save(confirmationKey);
        return "We have sent an email to reset your password";
    }

    @GetMapping("/profile")
    public Authentication authentication(Authentication authentication) {
        return authentication;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestParam String username, @RequestParam String password,
            HttpServletRequest request, HttpServletResponse response) {
        String ip = extractClientIp(request);
        PiiSafeLogger.info(SecurityController.class,
                String.format(LOG_MESSAGE_FORMAT_3, username, ip));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    auditService.logFailedLogin(username, ip, "User not found");
                    return new LoginException("User not found.");
                });

        // Anti brute-force : si le compte est encore dans sa fenetre de verrouillage,
        // on refuse l'authentification sans meme appeler le AuthenticationManager.
        if (user.getLockUntil() != null && user.getLockUntil().isAfter(LocalDateTime.now())) {
            auditService.logFailedLogin(username, ip, "Account locked");
            PiiSafeLogger.warn(SecurityController.class,
                    String.format(LOG_MESSAGE_FORMAT_4, username, ip) + " - account locked until "
                            + user.getLockUntil());
            throw new LoginException("Account temporarily locked due to repeated failed login attempts.");
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password));

            String scope = authentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority).collect(Collectors.joining(" "));

            String jwt = generateJwt(username, scope, user.getEmail());

            // Reset le compteur d'echecs apres login reussi.
            if (user.getFailedLoginAttempts() != null && user.getFailedLoginAttempts() > 0) {
                user.setFailedLoginAttempts(0);
                user.setLockUntil(null);
                userRepository.save(user);
            }

            // Audit : LOGIN_SUCCESS
            auditService.logLogin(username, ip);
            PiiSafeLogger.info(SecurityController.class,
                    String.format(LOG_MESSAGE_FORMAT_5, username, ip));

            // Set JWT in HttpOnly cookie
            ResponseCookie cookie = buildJwtCookie(jwt);
            response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

            // Return metadata only — NO token in body
            Map<String, Object> body = new HashMap<>();
            body.put("userId", user.getId());
            body.put("username", username);
            body.put("role", scope);
            body.put(EMAIL_KEY, user.getEmail());
            body.put("expiresIn", JWT_DURATION_MINUTES * 60);

            return ResponseEntity.ok(body);
        } catch (AuthenticationException e) {
            // Incrementer le compteur ; au-dela du seuil, verrouiller le compte.
            int attempts = (user.getFailedLoginAttempts() != null ? user.getFailedLoginAttempts() : 0) + 1;
            user.setFailedLoginAttempts(attempts);
            if (attempts >= lockoutMaxAttempts) {
                user.setLockUntil(LocalDateTime.now().plusMinutes(lockoutDurationMinutes));
                PiiSafeLogger.warn(SecurityController.class,
                        "Account locked for username=" + username + " after " + attempts
                                + " failed attempts (lock for " + lockoutDurationMinutes + " minutes)");
            }
            userRepository.save(user);

            auditService.logFailedLogin(username, ip, "Invalid credentials (attempt " + attempts + ")");
            PiiSafeLogger.warn(SecurityController.class,
                    String.format("Login failed for username=%s from IP %s — Invalid credentials (attempts=%d)",
                            username, ip, attempts));
            throw new LoginException("Invalid username or password.");
        } catch (Exception e) {
            auditService.logFailedLogin(username, ip, "Server error: " + e.getMessage());
            PiiSafeLogger.warn(SecurityController.class,
                    String.format("Login failed for username=%s from IP %s - Server error", username, ip));
            throw new LoginException("Authentication failed due to server configuration.");
        }
    }

    @GetMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refreshToken(Authentication authentication,
            HttpServletResponse response) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String username = authentication.getName();
        String scope = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority).collect(Collectors.joining(" "));

        User user = userRepository.findByUsername(username)
                .orElse(null);
        String email = user != null ? user.getEmail() : "";

        String jwt = generateJwt(username, scope, email);

        ResponseCookie cookie = buildJwtCookie(jwt);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        Map<String, Object> body = new HashMap<>();
        body.put("userId", user != null ? user.getId() : null);
        body.put("username", username);
        body.put("role", scope);
        body.put(EMAIL_KEY, email);
        body.put("expiresIn", JWT_DURATION_MINUTES * 60);

        log.info("Token refreshed for user={}", username);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(HttpServletResponse response) {
        ResponseCookie expiredCookie = buildExpiredCookie();
        response.addHeader(HttpHeaders.SET_COOKIE, expiredCookie.toString());
        return ResponseEntity.ok(new MessageResponse("Logged out successfully"));
    }

    @PostMapping("/request-reset")
    public ResponseEntity<MessageResponse> requestDeviceReset(@RequestParam String username) {
        // Envoyer un email à l'administrateur ou déclencher une action pour
        // réinitialiser les appareils
        SimpleMailMessage simpleMailMessage = new SimpleMailMessage();
        simpleMailMessage.setTo(adminEmail);
        simpleMailMessage.setSubject("Device Reset Request");
        simpleMailMessage.setText("User " + username + " has requested to reset their device IDs.");
        emailService.send(simpleMailMessage);

        return ResponseEntity.ok(new MessageResponse("Device reset request has been sent."));
    }

    @PostMapping("/reset-devices")
    public ResponseEntity<MessageResponse> resetDevices(@RequestParam String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found."));

        user.getDeviceIds().clear();
        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("Device IDs have been reset."));
    }

    @PostMapping("/signup")
    public ResponseEntity<MessageResponse> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        // 0) Gestion de l'ID : si fourni, on l'accepte (et on vérifie qu'il n'existe
        // pas déjà)
        if (signUpRequest.getId() != null && !signUpRequest.getId().isBlank()
                && userRepository.existsById(signUpRequest.getId())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: ID is already taken!"));
        }

        // 1) Vérifier que le username n’est pas déjà pris
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Username is already taken!"));
        }

        // 2) Vérifier que l’email n’est pas déjà utilisé
        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Email is already in use!"));
        }

        // 3) Création de l’objet User (le constructeur ne touche pas à l’ID)
        User user = new User(
                signUpRequest.getUsername(),
                signUpRequest.getFirstName(),
                signUpRequest.getLastName(),
                signUpRequest.getPhoneNumber(),
                signUpRequest.getEmail(),
                encoder.encode(signUpRequest.getPassword()));

        // 4) Si un ID a été fourni, on le fixe ; sinon, @PrePersist de User générera un
        // UUID
        user.setId(signUpRequest.getId());

        // 5) Récupération des rôles
        String strRole = signUpRequest.getRole();
        Set<Role> roles = new HashSet<>();

        if (strRole == null || strRole.isBlank() || strRole.isEmpty()) {
            // Aucun rôle fourni → rôle par défaut ENSEIGNANT
            Role defaultRole = roleRepository.findByName(ERole.ENSEIGNANT)
                    .orElseThrow(() -> new BadRequestException("Error: Default role 'ENSEIGNANT' is not found."));
            roles.add(defaultRole);
            log.info("Aucun rôle spécifié pour l'utilisateur '{}', attribution du rôle par défaut ENSEIGNANT",
                    signUpRequest.getUsername());
        } else {
            switch (strRole) {
                case "admin":
                    roles.add(roleRepository.findByName(ERole.ADMIN)
                            .orElseThrow(() -> new BadRequestException("Error: Role 'admin' is not found.")));
                    break;

                case "CUP":
                    roles.add(roleRepository.findByName(ERole.CUP)
                            .orElseThrow(() -> new BadRequestException("Error: Role 'CUP' is not found.")));
                    break;

                case "Enseignant":
                    roles.add(roleRepository.findByName(ERole.ENSEIGNANT)
                            .orElseThrow(() -> new BadRequestException("Error: Role 'Enseignant' is not found.")));
                    break;

                case "Formateur":
                    roles.add(roleRepository.findByName(ERole.FORMATEUR)
                            .orElseThrow(() -> new BadRequestException("Error: Role 'Formateur' is not found.")));
                    break;

                default:
                    throw new BadRequestException("Error: Role '" + strRole + "' is not recognized.");
            }
        }

        user.setRoles(roles);

        // 6) Sauvegarde
        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }

    private String generateJwt(String username, String scope, String email) {
        JwtClaimsSet jwtClaimsSet = JwtClaimsSet.builder()
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plus(JWT_DURATION_MINUTES, ChronoUnit.MINUTES))
                .subject(username)
                .claim("scope", scope)
                .claim(EMAIL_KEY, email)
                .build();

        JwtEncoderParameters jwtEncoderParameters = JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS512).build(),
                jwtClaimsSet);
        return jwtEncoder.encode(jwtEncoderParameters).getTokenValue();
    }

    /**
     * Construit le cookie HttpOnly + Secure + SameSite=Strict contenant le JWT.
     */
    private ResponseCookie buildJwtCookie(String jwt) {
        return ResponseCookie.from(COOKIE_NAME, jwt)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/")
                .maxAge(JWT_DURATION_MINUTES * 60L)
                .build();
    }

    /**
     * Construit un cookie expiré pour invalider le JWT (logout).
     */
    private ResponseCookie buildExpiredCookie() {
        return ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/")
                .maxAge(0)
                .build();
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
