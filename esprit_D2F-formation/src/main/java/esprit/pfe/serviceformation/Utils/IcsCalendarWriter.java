package esprit.pfe.serviceformation.utils;

import esprit.pfe.serviceformation.config.CalendarProperties;
import esprit.pfe.serviceformation.dto.calendar.IcsEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Sérialiseur iCalendar conforme RFC 5545, compatible Outlook, Google Calendar
 * et Apple Calendar.
 * <p>
 * Garantit : en-tête VCALENDAR complet, bloc VTIMEZONE pour le fuseau configuré,
 * UID/DTSTAMP/DTSTART/DTEND/SUMMARY/DESCRIPTION/LOCATION/STATUS/ORGANIZER,
 * échappement correct des caractères spéciaux et pliage des lignes longues
 * (« line folding » à 75 octets, RFC 5545 §3.1).
 * <p>
 * Note : le bloc VTIMEZONE est généré à offset fixe à partir du décalage courant
 * du {@link ZoneId} configuré. Adapté aux fuseaux sans heure d'été (cas de
 * {@code Africa/Tunis}, UTC+1 toute l'année).
 */
@Component
@RequiredArgsConstructor
public class IcsCalendarWriter {

    private static final String CRLF = "\r\n";
    private static final int FOLD_LIMIT_OCTETS = 73; // 75 - marge pour l'espace de continuation
    private static final DateTimeFormatter LOCAL_FMT = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss");
    private static final DateTimeFormatter UTC_FMT = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");

    public static final String METHOD_PUBLISH = "PUBLISH";
    public static final String METHOD_REQUEST = "REQUEST";

    private final CalendarProperties properties;

    /** Calendrier d'export simple (lecture seule côté client). */
    public String buildPublishCalendar(List<IcsEvent> events) {
        return buildCalendar(METHOD_PUBLISH, events, false);
    }

    /** Calendrier d'invitation (avec ORGANIZER + ATTENDEE par évènement). */
    public String buildRequestCalendar(List<IcsEvent> events) {
        return buildCalendar(METHOD_REQUEST, events, true);
    }

    public String[] buildRequestCalendarAsArray(List<IcsEvent> events) {
        String ics = buildRequestCalendar(events);
        return ics != null ? new String[]{ics} : new String[0];
    }

    private String buildCalendar(String method, List<IcsEvent> events, boolean withAttendees) {
        StringBuilder sb = new StringBuilder();
        appendLine(sb, "BEGIN:VCALENDAR");
        appendLine(sb, "VERSION:2.0");
        appendLine(sb, "PRODID:" + properties.getProdid());
        appendLine(sb, "CALSCALE:GREGORIAN");
        appendLine(sb, "METHOD:" + method);
        appendVtimezone(sb);

        for (IcsEvent event : events) {
            appendEvent(sb, event, withAttendees);
        }

        appendLine(sb, "END:VCALENDAR");
        return sb.toString();
    }

    private void appendVtimezone(StringBuilder sb) {
        String tzid = properties.getTimezone();
        ZoneId zone = ZoneId.of(tzid);
        ZoneOffset offset = zone.getRules().getOffset(Instant.now());
        String offsetText = formatOffset(offset);

        appendLine(sb, "BEGIN:VTIMEZONE");
        appendLine(sb, "TZID:" + tzid);
        appendLine(sb, "BEGIN:STANDARD");
        appendLine(sb, "DTSTART:19700101T000000");
        appendLine(sb, "TZOFFSETFROM:" + offsetText);
        appendLine(sb, "TZOFFSETTO:" + offsetText);
        appendLine(sb, "TZNAME:" + tzid);
        appendLine(sb, "END:STANDARD");
        appendLine(sb, "END:VTIMEZONE");
    }

    private void appendEvent(StringBuilder sb, IcsEvent event, boolean withAttendees) {
        String tzid = properties.getTimezone();
        appendLine(sb, "BEGIN:VEVENT");
        appendLine(sb, "UID:" + event.getUid());
        appendLine(sb, "DTSTAMP:" + nowUtc());
        appendLine(sb, "DTSTART;TZID=" + tzid + ":" + LOCAL_FMT.format(event.getStart()));
        appendLine(sb, "DTEND;TZID=" + tzid + ":" + LOCAL_FMT.format(event.getEnd()));
        appendLine(sb, "SUMMARY:" + escapeText(event.getSummary()));
        if (notBlank(event.getDescription())) {
            appendLine(sb, "DESCRIPTION:" + escapeText(event.getDescription()));
        }
        if (notBlank(event.getLocation())) {
            appendLine(sb, "LOCATION:" + escapeText(event.getLocation()));
        }
        appendLine(sb, "ORGANIZER;CN=" + escapeParam(properties.getOrganizerName())
                + ":mailto:" + properties.getOrganizerEmail());
        if (withAttendees && event.getAttendeeEmails() != null) {
            for (String email : event.getAttendeeEmails()) {
                if (notBlank(email)) {
                    appendLine(sb, "ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:"
                            + email.trim());
                }
            }
            appendLine(sb, "SEQUENCE:0");
        }
        appendLine(sb, "STATUS:" + (notBlank(event.getStatus()) ? event.getStatus() : "CONFIRMED"));
        appendLine(sb, "END:VEVENT");
    }

    private String nowUtc() {
        return UTC_FMT.format(ZonedDateTime.now(ZoneOffset.UTC));
    }

    private static String formatOffset(ZoneOffset offset) {
        int totalSeconds = offset.getTotalSeconds();
        String sign = totalSeconds < 0 ? "-" : "+";
        int abs = Math.abs(totalSeconds);
        int hours = abs / 3600;
        int minutes = (abs % 3600) / 60;
        return String.format("%s%02d%02d", sign, hours, minutes);
    }

    /** Échappement TEXT (RFC 5545 §3.3.11) : backslash, point-virgule, virgule, saut de ligne. */
    static String escapeText(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("\\", "\\\\")
                .replace(";", "\\;")
                .replace(",", "\\,")
                .replace("\r\n", "\\n")
                .replace("\n", "\\n")
                .replace("\r", "\\n");
    }

    /** Échappement minimal pour une valeur de paramètre (ex. CN=). */
    static String escapeParam(String text) {
        if (text == null) {
            return "";
        }
        return "\"" + text.replace("\"", "'") + "\"";
    }

    /**
     * Ajoute une ligne de contenu en appliquant le pliage RFC 5545 :
     * découpe à 75 octets (UTF-8), continuation préfixée d'un espace.
     */
    static void appendLine(StringBuilder sb, String contentLine) {
        byte[] bytes = contentLine.getBytes(StandardCharsets.UTF_8);
        if (bytes.length <= FOLD_LIMIT_OCTETS + 2) {
            sb.append(contentLine).append(CRLF);
            return;
        }
        int octetCount = 0;
        boolean firstSegment = true;
        StringBuilder segment = new StringBuilder();
        int i = 0;
        while (i < contentLine.length()) {
            int codePoint = contentLine.codePointAt(i);
            int charCount = Character.charCount(codePoint);
            int cpOctets = new String(Character.toChars(codePoint)).getBytes(StandardCharsets.UTF_8).length;
            if (octetCount + cpOctets > FOLD_LIMIT_OCTETS) {
                sb.append(firstSegment ? "" : " ").append(segment).append(CRLF);
                segment.setLength(0);
                octetCount = 0;
                firstSegment = false;
            }
            segment.appendCodePoint(codePoint);
            octetCount += cpOctets;
            i += charCount;
        }
        if (!segment.isEmpty()) {
            sb.append(firstSegment ? "" : " ").append(segment).append(CRLF);
        }
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
