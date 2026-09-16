package esprit.pfe.serviceformation.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Configuration externalisée de la fonctionnalité Calendrier (DSI §1.1 — aucune
 * valeur métier en dur dans le code). Toutes les clés sont injectées via
 * {@code application.properties} / variables d'environnement (préfixe {@code calendar.*}).
 */
@Component
@ConfigurationProperties(prefix = "calendar")
@Data
public class CalendarProperties {

    /** Fuseau horaire iCalendar (RFC 5545 VTIMEZONE). Défaut : Africa/Tunis. */
    private String timezone = "Africa/Tunis";

    /** PRODID iCalendar (identifie le logiciel producteur). */
    private String prodid = "-//ESPRIT//D2F Formation//FR";

    /** Nom affiché de l'organisateur (ORGANIZER;CN=). */
    private String organizerName = "Direction de la Formation (D2F)";

    /** Adresse e-mail de l'organisateur (ORGANIZER:mailto:). */
    private String organizerEmail = "noreply@d2f.local";

    /** Préfixe ajouté au SUMMARY de chaque évènement. */
    private String summaryPrefix = "[D2F] ";

    private final ImportSettings importSettings = new ImportSettings();
    private final MailSettings mail = new MailSettings();

    /** Alias de liaison pour la clé {@code calendar.import.*}. */
    public ImportSettings getImport() {
        return importSettings;
    }

    @Data
    public static class ImportSettings {
        /** Taille maximale autorisée du fichier .xlsx (octets). */
        private long maxFileSizeBytes = 10L * 1024 * 1024;
        /** Mots-clés (insensibles à la casse) permettant de localiser les colonnes par en-tête. */
        private final HeaderKeywords headerKeywords = new HeaderKeywords();
    }

    @Data
    public static class HeaderKeywords {
        private List<String> date = List.of("date");
        private List<String> formation = List.of("formation");
        private List<String> trainer = List.of("animateur", "formateur", "trainer");
        private List<String> room = List.of("salle", "room");
        private List<String> status = List.of("statut", "teams", "status", "mode");
        private List<String> timeSlot = List.of("créneau", "creneau", "horaire", "plage", "time");
        private List<String> session = List.of("séance", "seance", "session");
    }

    @Data
    public static class MailSettings {
        /** Adresse d'expédition (From) des invitations. */
        private String from = "noreply@d2f.local";
        private final AsyncSettings async = new AsyncSettings();
    }

    @Data
    public static class AsyncSettings {
        private int corePoolSize = 2;
        private int maxPoolSize = 5;
        private int queueCapacity = 200;
    }
}
