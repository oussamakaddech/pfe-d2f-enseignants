package esprit.pfe.auth.services;

import esprit.pfe.auth.entities.ConfirmationKey;
import esprit.pfe.auth.entities.ERole;
import esprit.pfe.auth.entities.Role;
import esprit.pfe.auth.entities.User;
import esprit.pfe.auth.error.BadRequestException;
import esprit.pfe.auth.error.LoginException;
import esprit.pfe.auth.error.TokenExpiredException;
import esprit.pfe.auth.payload.request.SignupRequest;
import esprit.pfe.auth.repositories.ConfirmationKeyRepo;
import esprit.pfe.auth.repositories.RoleRepository;
import esprit.pfe.auth.repositories.UserRepository;
import esprit.pfe.auth.security.PiiSafeLogger;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

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

/**
 * Couche service de l'authentification (DSI #5).
 *
 * <p>Toute la logique métier qui surchargeait le god-controller {@code SecurityController}
 * (521 lignes) vit désormais ici : login + anti brute-force, inscription, réinitialisation
 * de mot de passe, rafraîchissement de jeton, reset des appareils, émission JWT. Le
 * contrôleur se réduit à un adaptateur HTTP (extraction d'IP, cookies, ResponseEntity).
 */
@Service
@Slf4j
public class AuthService {

    private static final String LOG_MESSAGE_RESET_SUCCESS = "Password reset successful for %s from IP %s";
    private static final String LOG_MESSAGE_RESET_REQUEST = "Password reset requested for %s from IP %s";
    private static final String LOG_MESSAGE_LOGIN_ATTEMPT = "Login attempt for username=%s from IP %s";
    private static final String LOG_MESSAGE_LOGIN_REFUSED = "Login refused for username=%s from IP %s";
    private static final String LOG_MESSAGE_LOGIN_SUCCESS = "Login successful for username=%s from IP %s";
    private static final String EMAIL_KEY = "email";
    public static final String PASSWORD_RESET_GENERIC_MESSAGE =
            "If this email address is registered, you will receive a password reset link.";

    public static final int JWT_DURATION_MINUTES = 120;

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

    @Value("${auth.lockout.max-attempts:5}")
    private int lockoutMaxAttempts;

    @Value("${auth.lockout.duration-minutes:15}")
    private int lockoutDurationMinutes;

    @SuppressWarnings("java:S107") // 8 collaborateurs domaine irréductibles (email, repos
                                   // user/role/key, encodeur JWT, encodeur mot de passe,
                                   // auth manager, audit).
    public AuthService(
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

    /** Résultat d'une émission de session : jeton JWT + corps de réponse + durée du cookie. */
    public record JwtSession(String token, Map<String, Object> body, long maxAgeSeconds) {
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Réinitialisation de mot de passe
    // ──────────────────────────────────────────────────────────────────────────

    public String resetPassword(String rawToken, String newPassword, String ip) {
        String tokenHash = hashConfirmationToken(rawToken);
        checkIfTokenIsValid(tokenHash);
        String result = resetPasswordAndDeleteToken(tokenHash, newPassword);

        ConfirmationKey key = confirmationKeyRepo.findByToken(tokenHash).orElse(null);
        String email = key != null ? key.getEmailAddress() : "unknown";
        auditService.logPasswordResetSuccess(email, ip);
        PiiSafeLogger.info(AuthService.class, String.format(LOG_MESSAGE_RESET_SUCCESS, email, ip));
        return result;
    }

    /** Hashe un token de confirmation avec SHA-256 (hex minuscule) — clé de recherche en base. */
    public static String hashConfirmationToken(String rawToken) {
        if (rawToken == null) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponible dans la JVM", e);
        }
    }

    /** Vérifie qu'un token (déjà hashé) existe et n'est pas expiré. */
    public void checkIfTokenIsValid(String tokenHash) {
        ConfirmationKey key = confirmationKeyRepo.findByToken(tokenHash)
                .orElseThrow(() -> new BadRequestException("Confirmation token invalid"));
        if (key.getExpiresAt().isBefore(LocalDateTime.now())) {
            confirmationKeyRepo.delete(key);
            throw new TokenExpiredException("Confirmation token has expired");
        }
    }

    /** Réinitialise le mot de passe via un token déjà hashé et supprime l'entrée de confirmation. */
    public String resetPasswordAndDeleteToken(String tokenHash, String newPassword) {
        ConfirmationKey confirmationKey = confirmationKeyRepo.findByToken(tokenHash)
                .orElseThrow(() -> new BadRequestException("Confirmation token not found"));
        User user = userRepository.findByEmail(confirmationKey.getEmailAddress())
                .orElseThrow(() -> new BadRequestException("User associated with this token not found"));
        user.setPassword(encoder.encode(newPassword));
        userRepository.save(user);
        confirmationKeyRepo.delete(confirmationKey);
        return "Password changed";
    }

    public void forgotPassword(String emailAddress, String ip) {
        // DSI §8.3 — réponse identique que l'email existe ou non (anti-énumération).
        auditService.logPasswordResetRequest(emailAddress, ip);
        if (!userRepository.existsByEmail(emailAddress)) {
            PiiSafeLogger.info(AuthService.class,
                    String.format("Password reset requested for non-existent email from IP %s", ip));
            return;
        }
        if (confirmationKeyRepo.existsByEmailAddress(emailAddress)) {
            return;
        }
        final var key = UUID.randomUUID().toString();
        SimpleMailMessage simpleMailMessage = new SimpleMailMessage();
        simpleMailMessage.setTo(emailAddress);
        simpleMailMessage.setSubject("Password reset");
        simpleMailMessage.setFrom(mailFrom);
        simpleMailMessage.setText("To change your password add this confirmation token: " + key);
        emailService.send(simpleMailMessage);

        PiiSafeLogger.info(AuthService.class, String.format(LOG_MESSAGE_RESET_REQUEST, emailAddress, ip));
        generateAndPersistToken(emailAddress, key);
    }

    public String generateAndPersistToken(String emailAddress, String key) {
        ConfirmationKey confirmationKey = new ConfirmationKey();
        confirmationKey.setEmailAddress(emailAddress);
        confirmationKey.setToken(hashConfirmationToken(key));
        confirmationKey.setExpiresAt(LocalDateTime.now().plusMinutes(15));
        confirmationKeyRepo.save(confirmationKey);
        return "We have sent an email to reset your password";
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Login + anti brute-force
    // ──────────────────────────────────────────────────────────────────────────

    public JwtSession login(String username, String password, String ip) {
        PiiSafeLogger.info(AuthService.class, String.format(LOG_MESSAGE_LOGIN_ATTEMPT, username, ip));

        User user = userRepository.findByUsername(username)
                .or(() -> userRepository.findById(username))
                .orElseThrow(() -> {
                    auditService.logFailedLogin(username, ip, "User not found");
                    return new LoginException("User not found.");
                });

        if (user.getLockUntil() != null && user.getLockUntil().isAfter(LocalDateTime.now())) {
            auditService.logFailedLogin(username, ip, "Account locked");
            PiiSafeLogger.warn(AuthService.class,
                    String.format(LOG_MESSAGE_LOGIN_REFUSED, username, ip) + " - account locked until "
                            + user.getLockUntil());
            throw new LoginException("Account temporarily locked due to repeated failed login attempts.");
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password));

            String scope = authentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority).collect(Collectors.joining(" "));

            String jwt = generateJwt(username, scope, user.getEmail());

            if (user.getFailedLoginAttempts() != null && user.getFailedLoginAttempts() > 0) {
                user.setFailedLoginAttempts(0);
                user.setLockUntil(null);
                userRepository.save(user);
            }

            auditService.logLogin(username, ip);
            PiiSafeLogger.info(AuthService.class, String.format(LOG_MESSAGE_LOGIN_SUCCESS, username, ip));

            Map<String, Object> body = new HashMap<>();
            body.put("userId", user.getId());
            body.put("username", user.getUsername());
            body.put("role", scope);
            body.put(EMAIL_KEY, user.getEmail());
            body.put("expiresIn", JWT_DURATION_MINUTES * 60);

            return new JwtSession(jwt, body, JWT_DURATION_MINUTES * 60L);
        } catch (AuthenticationException e) {
            int attempts = (user.getFailedLoginAttempts() != null ? user.getFailedLoginAttempts() : 0) + 1;
            user.setFailedLoginAttempts(attempts);
            if (attempts >= lockoutMaxAttempts) {
                user.setLockUntil(LocalDateTime.now().plusMinutes(lockoutDurationMinutes));
                PiiSafeLogger.warn(AuthService.class,
                        "Account locked for username=" + username + " after " + attempts
                                + " failed attempts (lock for " + lockoutDurationMinutes + " minutes)");
            }
            userRepository.save(user);

            auditService.logFailedLogin(username, ip, "Invalid credentials (attempt " + attempts + ")");
            PiiSafeLogger.warn(AuthService.class,
                    String.format("Login failed for username=%s from IP %s — Invalid credentials (attempts=%d)",
                            username, ip, attempts));
            throw new LoginException("Invalid username or password.");
        } catch (Exception e) {
            auditService.logFailedLogin(username, ip, "Server error: " + e.getMessage());
            PiiSafeLogger.warn(AuthService.class,
                    String.format("Login failed for username=%s from IP %s - Server error", username, ip));
            throw new LoginException("Authentication failed due to server configuration.");
        }
    }

    /** Rafraîchit la session d'un utilisateur déjà authentifié. */
    public JwtSession refresh(Authentication authentication) {
        String username = authentication.getName();
        String scope = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority).collect(Collectors.joining(" "));

        User user = userRepository.findByUsername(username).orElse(null);
        String email = user != null ? user.getEmail() : "";

        String jwt = generateJwt(username, scope, email);

        Map<String, Object> body = new HashMap<>();
        body.put("userId", user != null ? user.getId() : null);
        body.put("username", username);
        body.put("role", scope);
        body.put(EMAIL_KEY, email);
        body.put("expiresIn", JWT_DURATION_MINUTES * 60);

        log.info("Token refreshed for user={}", username);
        return new JwtSession(jwt, body, JWT_DURATION_MINUTES * 60L);
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Appareils
    // ──────────────────────────────────────────────────────────────────────────

    public void requestDeviceReset(String username) {
        SimpleMailMessage simpleMailMessage = new SimpleMailMessage();
        simpleMailMessage.setTo(adminEmail);
        simpleMailMessage.setSubject("Device Reset Request");
        simpleMailMessage.setText("User " + username + " has requested to reset their device IDs.");
        emailService.send(simpleMailMessage);
    }

    public void resetDevices(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found."));
        user.getDeviceIds().clear();
        userRepository.save(user);
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Inscription
    // ──────────────────────────────────────────────────────────────────────────

    public void registerUser(SignupRequest signUpRequest) {
        if (signUpRequest.getId() != null && !signUpRequest.getId().isBlank()
                && userRepository.existsById(signUpRequest.getId())) {
            throw new BadRequestException("Error: ID is already taken!");
        }
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            throw new BadRequestException("Error: Username is already taken!");
        }
        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            throw new BadRequestException("Error: Email is already in use!");
        }

        User user = new User(
                signUpRequest.getUsername(),
                signUpRequest.getFirstName(),
                signUpRequest.getLastName(),
                signUpRequest.getPhoneNumber(),
                signUpRequest.getEmail(),
                encoder.encode(signUpRequest.getPassword()));
        user.setId(signUpRequest.getId());

        String strRole = signUpRequest.getRole();
        Set<Role> roles = new HashSet<>();

        if (strRole == null || strRole.isBlank() || strRole.isEmpty()) {
            Role defaultRole = roleRepository.findByName(ERole.ENSEIGNANT)
                    .orElseThrow(() -> new BadRequestException("Error: Default role 'ENSEIGNANT' is not found."));
            roles.add(defaultRole);
            log.info("Aucun rôle spécifié pour l'utilisateur '{}', attribution du rôle par défaut ENSEIGNANT",
                    signUpRequest.getUsername());
        } else {
            switch (strRole) {
                case "admin" -> roles.add(roleRepository.findByName(ERole.ADMIN)
                        .orElseThrow(() -> new BadRequestException("Error: Role 'admin' is not found.")));
                case "CUP" -> roles.add(roleRepository.findByName(ERole.CUP)
                        .orElseThrow(() -> new BadRequestException("Error: Role 'CUP' is not found.")));
                case "Enseignant" -> roles.add(roleRepository.findByName(ERole.ENSEIGNANT)
                        .orElseThrow(() -> new BadRequestException("Error: Role 'Enseignant' is not found.")));
                case "Formateur" -> roles.add(roleRepository.findByName(ERole.FORMATEUR)
                        .orElseThrow(() -> new BadRequestException("Error: Role 'Formateur' is not found.")));
                default -> throw new BadRequestException("Error: Role '" + strRole + "' is not recognized.");
            }
        }

        user.setRoles(roles);
        userRepository.save(user);
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  JWT
    // ──────────────────────────────────────────────────────────────────────────

    public String generateJwt(String username, String scope, String email) {
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
}
