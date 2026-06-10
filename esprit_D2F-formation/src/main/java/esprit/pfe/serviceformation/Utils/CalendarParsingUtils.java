package esprit.pfe.serviceformation.utils; // NOSONAR - project-wide convention

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Fonctions de parsing et de validation propres à l'import du calendrier des
 * ateliers : e-mails, dates, créneaux horaires et numérotation « Séance X/Y ».
 * <p>
 * Toutes les méthodes sont tolérantes : elles renvoient un {@link Optional} vide
 * plutôt que de lever une exception, afin que l'import puisse ignorer une ligne
 * invalide sans interrompre le traitement global.
 */
public final class CalendarParsingUtils {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$");

    // « Séance 1/3 », « Seance 1 / 3 », « S1/3 », ou simplement « 1/3 »
    private static final Pattern SESSION_PATTERN =
            Pattern.compile("(?i)(?:s[ée]ance?\\s*)?(\\d{1,3})\\s*/\\s*(\\d{1,3})");

    // Deux heures séparées par - – à to : « 09:00-12:00 », « 9h - 12h30 », « 09:00 à 12:00 »
    private static final Pattern TIME_SLOT_PATTERN = Pattern.compile(
            "(\\d{1,2})\\s*[:hH]\\s*(\\d{0,2}).*?[-–—àaA to]+.*?(\\d{1,2})\\s*[:hH]\\s*(\\d{0,2})");

    private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
            DateTimeFormatter.ofPattern("d/M/uuuu"),
            DateTimeFormatter.ofPattern("dd/MM/uuuu"),
            DateTimeFormatter.ofPattern("d-M-uuuu"),
            DateTimeFormatter.ofPattern("dd-MM-uuuu"),
            DateTimeFormatter.ofPattern("uuuu-MM-dd"),
            DateTimeFormatter.ofPattern("d.M.uuuu"));

    private CalendarParsingUtils() {
    }

    /** Vrai si la chaîne est une adresse e-mail syntaxiquement valide. */
    public static boolean isValidEmail(String value) {
        return value != null && EMAIL_PATTERN.matcher(value.trim()).matches();
    }

    /** Parse une date depuis une chaîne en testant plusieurs formats usuels. */
    public static Optional<LocalDate> parseDate(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        String cleaned = value.trim();
        for (DateTimeFormatter fmt : DATE_FORMATS) {
            try {
                return Optional.of(LocalDate.parse(cleaned, fmt));
            } catch (java.time.format.DateTimeParseException ignored) {
                // format suivant
            }
        }
        return Optional.empty();
    }

    /** Parse une heure isolée (« 09:00 », « 9h », « 09h30 »). */
    public static Optional<LocalTime> parseTime(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        Matcher m = Pattern.compile("(\\d{1,2})\\s*[:hH]\\s*(\\d{0,2})").matcher(value.trim());
        if (m.find()) {
            return buildTime(m.group(1), m.group(2));
        }
        return Optional.empty();
    }

    /**
     * Parse un créneau « 09:00-12:00 » et renvoie [début, fin].
     * @return un tableau {début, fin} ou {@link Optional#empty()} si non reconnu
     */
    public static Optional<LocalTime[]> parseTimeSlot(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        Matcher m = TIME_SLOT_PATTERN.matcher(value.trim());
        if (m.find()) {
            Optional<LocalTime> start = buildTime(m.group(1), m.group(2));
            Optional<LocalTime> end = buildTime(m.group(3), m.group(4));
            if (start.isPresent() && end.isPresent()) {
                return Optional.of(new LocalTime[]{start.get(), end.get()});
            }
        }
        return Optional.empty();
    }

    /**
     * Parse une numérotation « Séance X/Y ».
     * @return un tableau {X, Y} ou {@link Optional#empty()} si non reconnu
     */
    public static Optional<int[]> parseSession(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        Matcher m = SESSION_PATTERN.matcher(value.trim());
        if (m.find()) {
            int x = Integer.parseInt(m.group(1));
            int y = Integer.parseInt(m.group(2));
            if (x >= 1 && y >= 1 && x <= y) {
                return Optional.of(new int[]{x, y});
            }
        }
        return Optional.empty();
    }

    private static Optional<LocalTime> buildTime(String hh, String mm) {
        try {
            int hour = Integer.parseInt(hh);
            int minute = (mm == null || mm.isBlank()) ? 0 : Integer.parseInt(mm);
            if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
                return Optional.empty();
            }
            return Optional.of(LocalTime.of(hour, minute));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }
}
