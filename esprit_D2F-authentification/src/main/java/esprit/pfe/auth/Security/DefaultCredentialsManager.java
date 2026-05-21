package esprit.pfe.auth.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Gestionnaire sécurisé des identifiants par défaut pour l'initialisation du système.
 * Cette classe évite le hardcoding des identifiants dans le code source.
 */
@Component
public class DefaultCredentialsManager {

    private final String defaultAdminUsername;
    private final String defaultAdminPassword;
    private final String defaultAdminFirstName;
    private final String defaultAdminLastName;
    private final String defaultAdminPhone;
    private final String defaultAdminEmail;

    /**
     * Constructeur avec injection des valeurs depuis la configuration
     */
    public DefaultCredentialsManager(
            @Value("${app.security.default-admin.username:admin}") String defaultAdminUsername,
            @Value("${app.security.default-admin.password:CHANGE_ME_IN_PRODUCTION}") String defaultAdminPassword,
            @Value("${app.security.default-admin.first-name:System}") String defaultAdminFirstName,
            @Value("${app.security.default-admin.last-name:Admin}") String defaultAdminLastName,
            @Value("${app.security.default-admin.phone:00000000}") String defaultAdminPhone,
            @Value("${app.security.default-admin.email:admin@d2f.local}") String defaultAdminEmail) {

        this.defaultAdminUsername = defaultAdminUsername;
        this.defaultAdminPassword = defaultAdminPassword;
        this.defaultAdminFirstName = defaultAdminFirstName;
        this.defaultAdminLastName = defaultAdminLastName;
        this.defaultAdminPhone = defaultAdminPhone;
        this.defaultAdminEmail = defaultAdminEmail;

        validateCredentials();
    }

    /**
     * Valide que les identifiants par défaut ne sont pas les valeurs par défaut en production
     */
    @SuppressWarnings("java:S2068") // False positive: password is injected from external config, not hardcoded
    private void validateCredentials() {
        if (isProductionEnvironment()) {
            rejectWeakPassword(defaultAdminPassword);
        }
    }

    private static final java.util.Set<String> BANNED_PASSWORDS = java.util.Set.of(
        "CHANGE_ME_IN_PRODUCTION", "admin", "admin123", "password", "password123",
        "123456", "azerty", "qwerty", "d2f", "esprit", "changeme", "test"
    );

    private void rejectWeakPassword(String password) {
        if (password == null || password.isBlank() || BANNED_PASSWORDS.contains(password.toLowerCase())) {
            throw new IllegalStateException(
                "Le mot de passe administrateur par défaut est trop faible ou non configuré. " +
                "Définissez APP_SECURITY_DEFAULT_ADMIN_PASSWORD avec un mot de passe fort " +
                "(min. 12 caractères, majuscules, chiffres, caractères spéciaux)."
            );
        }
        if (password.length() < 12) {
            throw new IllegalStateException(
                "Le mot de passe administrateur doit contenir au moins 12 caractères."
            );
        }
    }

    /**
     * Détermine si l'environnement est de production
     * @return true si en production
     */
    private boolean isProductionEnvironment() {
        String env = System.getProperty("spring.profiles.active");
        return env != null && env.contains("prod");
    }

    // Getters
    public String getDefaultAdminUsername() {
        return defaultAdminUsername;
    }

    public String getDefaultAdminPassword() {
        return defaultAdminPassword;
    }

    public String getDefaultAdminFirstName() {
        return defaultAdminFirstName;
    }

    public String getDefaultAdminLastName() {
        return defaultAdminLastName;
    }

    public String getDefaultAdminPhone() {
        return defaultAdminPhone;
    }

    public String getDefaultAdminEmail() {
        return defaultAdminEmail;
    }
}
