package esprit.pfe.auth.Security;

import esprit.pfe.auth.Entities.ConfirmationKey;
import esprit.pfe.auth.Entities.ERole;
import esprit.pfe.auth.Entities.Role;
import esprit.pfe.auth.Entities.User;
import esprit.pfe.auth.Repositories.ConfirmationKeyRepo;
import esprit.pfe.auth.Repositories.RoleRepository;
import esprit.pfe.auth.Repositories.UserRepository;
import esprit.pfe.auth.Services.EmailService;


import esprit.pfe.auth.error.BadRequestException;
import esprit.pfe.auth.error.LoginException;
import esprit.pfe.auth.payload.request.SignupRequest;
import esprit.pfe.auth.payload.response.MessageResponse;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.security.authentication.AuthenticationManager;
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

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/user/auth")
@Slf4j
public class SecurityController {
    /////autheeentication

    @Autowired
    EmailService emailService;
    @Autowired
    UserRepository userRepository;

    @Autowired
    RoleRepository roleRepository;
    @Autowired
    private AuthenticationManager authenticationManager;
    @Autowired
    private JwtEncoder jwtEncoder;
    @Autowired
    private ConfirmationKeyRepo confirmationKeyRepo;


    @Autowired
    private PasswordEncoder encoder;

    @PostMapping("/reset-password")
    private String resetPassword(@RequestParam String confirmationKey, @RequestParam String newPassword) {
        this.checkIfConfirmationKeyIsValid(confirmationKey);
        return this.resetPasswordAndDeleteConfirmationKey(confirmationKey, newPassword);
    }

    private void checkIfConfirmationKeyIsValid(String confirmationKey) {
        if (!this.confirmationKeyRepo.existsByConfirmationKey(confirmationKey))
            throw new BadRequestException("ConfirmationKey invalid");
    }

    private String resetPasswordAndDeleteConfirmationKey(String confirmationKey, String newPassword) {
        ConfirmationKey confirmationKey1 = this.confirmationKeyRepo.findByConfirmationKey(confirmationKey).get();
        User user = this.userRepository.findByEmail(confirmationKey1.getEmailAddress()).get();
        user.setPassword(this.encoder.encode(newPassword));
        this.userRepository.save(user);
        this.confirmationKeyRepo.delete(confirmationKey1);
        return "Password changed";
    }

    @PostMapping("/forgot-password")
    private String forgotPassword(@RequestParam String emailAddress) {
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
        simpleMailMessage.setFrom("clasherwin59@gmail.com");
        simpleMailMessage.setText("To change your password add this confirmation Key : " + key);
        emailService.send(simpleMailMessage);
        return this.generateAndPersistConfirmationKey(emailAddress, key);
    }

    private String generateAndPersistConfirmationKey(String emailAddress, String key) {
        User user = this.userRepository.findByEmail(emailAddress).get();
        ConfirmationKey confirmationKey = new ConfirmationKey();
        confirmationKey.setEmailAddress(emailAddress);
        confirmationKey.setConfirmationKey(key);
        this.confirmationKeyRepo.save(confirmationKey);
        return "We have sent an email to reset your password";
    }


    @GetMapping("/profile")
    public Authentication authentication(Authentication authentication) {
        return authentication;
    }

    @PostMapping("/login")
    public Map<String, String> login(@RequestParam String username, @RequestParam String password) {
        log.info("Attempting to log in with username: " + username + " and deviceId: " );

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new LoginException("User not found."));

        // Définir la limite du nombre d'appareils


        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password)
            );

            Instant instant = Instant.now();
            String scope = authentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority).collect(Collectors.joining(" "));
            JwtClaimsSet jwtClaimsSet = JwtClaimsSet.builder()
                    .issuedAt(Instant.now())
                    .expiresAt(Instant.now().plus(120, ChronoUnit.MINUTES))
                    .subject(username)                       // "sub" = username
                    .claim("scope", scope)                  // Par exemple "admin"
                    .claim("email", user.getEmail())        // Ajout du champ email
                    .build();

            JwtEncoderParameters jwtEncoderParameters =
                    JwtEncoderParameters.from(
                            JwsHeader.with(MacAlgorithm.HS512).build(),
                            jwtClaimsSet
                    );
            String jwt = jwtEncoder.encode(jwtEncoderParameters).getTokenValue();

            return Map.of("accessToken", jwt, "role", scope);
        } catch (Exception e) {
            throw new LoginException("Invalid username or password.");
        }
    }

    @PostMapping("/request-reset")
    public ResponseEntity<?> requestDeviceReset(@RequestParam String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found."));

        // Envoyer un email à l'administrateur ou déclencher une action pour réinitialiser les appareils
        SimpleMailMessage simpleMailMessage = new SimpleMailMessage();
        simpleMailMessage.setTo("ibtihel.benmustapha@esprit.tn");
        simpleMailMessage.setSubject("Device Reset Request");
        simpleMailMessage.setText("User " + username + " has requested to reset their device IDs.");
        emailService.send(simpleMailMessage);

        return ResponseEntity.ok(new MessageResponse("Device reset request has been sent."));
    }

    @PostMapping("/reset-devices")
    public ResponseEntity<?> resetDevices(@RequestParam String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found."));

        user.getDeviceIds().clear();
        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("Device IDs have been reset."));
    }


    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        // 0) Gestion de l’ID : si fourni, on l’accepte (et on vérifie qu’il n'existe pas déjà)
        if (signUpRequest.getId() != null && !signUpRequest.getId().isBlank()) {
            if (userRepository.existsById(signUpRequest.getId())) {
                return ResponseEntity
                        .badRequest()
                        .body(new MessageResponse("Error: ID is already taken!"));
            }
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
                encoder.encode(signUpRequest.getPassword())
        );

        // 4) Si un ID a été fourni, on le fixe ; sinon, @PrePersist de User générera un UUID
        user.setId(signUpRequest.getId());

        // 5) Récupération des rôles
        Set<String> strRoles = Set.of(signUpRequest.getRole());
        Set<Role> roles = new HashSet<>();

        if (strRoles == null) {
            Role userRole = roleRepository.findByName(ERole.admin)
                    .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            roles.add(userRole);
        } else {
            strRoles.forEach(role -> {
                switch (role) {
                    case "admin":
                        Role adminRole = roleRepository.findByName(ERole.admin)
                                .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                        roles.add(adminRole);
                        break;

                    case "CUP":
                        Role coachRole = roleRepository.findByName(ERole.CUP)
                                .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                        roles.add(coachRole);
                        break;

                    case "D2F":
                        Role scouterRole = roleRepository.findByName(ERole.D2F)
                                .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                        roles.add(scouterRole);
                        break;

                    default:
                        Role userRoleDefault = roleRepository.findByName(ERole.Formateur)
                                .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                        roles.add(userRoleDefault);
                }
            });
        }

        user.setRoles(roles);

        // 6) Sauvegarde
        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }

}

