package esprit.pfe.serviceformation.utils;

import esprit.pfe.serviceformation.config.CalendarProperties;
import esprit.pfe.serviceformation.dto.calendar.IcsEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("IcsCalendarWriter - conformité RFC 5545")
class IcsCalendarWriterTest {

    private final IcsCalendarWriter writer = new IcsCalendarWriter(new CalendarProperties());

    private IcsEvent sampleEvent(String summary, String description, List<String> attendees) {
        return IcsEvent.builder()
                .uid("d2f-seance-1@d2f.local")
                .start(LocalDateTime.of(2026, 6, 10, 9, 0))
                .end(LocalDateTime.of(2026, 6, 10, 12, 0))
                .summary(summary)
                .description(description)
                .location("Salle A")
                .status("CONFIRMED")
                .attendeeEmails(attendees)
                .build();
    }

    @Test
    @DisplayName("Le calendrier PUBLISH contient l'en-tête, le VTIMEZONE et un VEVENT complet")
    void publishCalendarIsWellFormed() {
        String ics = writer.buildPublishCalendar(List.of(sampleEvent("Atelier", "Desc", null)));

        assertThat(ics)
                .contains("BEGIN:VCALENDAR")
                .contains("VERSION:2.0")
                .contains("METHOD:PUBLISH")
                .contains("BEGIN:VTIMEZONE")
                .contains("TZID:Africa/Tunis")
                .contains("DTSTART;TZID=Africa/Tunis:20260610T090000")
                .contains("DTEND;TZID=Africa/Tunis:20260610T120000")
                .contains("DTSTAMP:")
                .contains("UID:d2f-seance-1@d2f.local")
                .contains("ORGANIZER;CN=")
                .contains("STATUS:CONFIRMED")
                .contains("END:VCALENDAR");
        assertThat(ics).endsWith("END:VCALENDAR\r\n");
    }

    @Test
    @DisplayName("Les caractères spéciaux sont échappés (virgule, point-virgule)")
    void escapesSpecialCharacters() {
        String ics = writer.buildPublishCalendar(List.of(sampleEvent("Java, niveau 1; avancé", "L1\nL2", null)));

        assertThat(ics).contains("SUMMARY:Java\\, niveau 1\\; avancé");
        assertThat(ics).contains("DESCRIPTION:L1\\nL2");
    }

    @Test
    @DisplayName("Les lignes longues sont pliées à 75 octets avec continuation par espace")
    void foldsLongLines() {
        String longDesc = "x".repeat(300);
        String ics = writer.buildPublishCalendar(List.of(sampleEvent("Atelier", longDesc, null)));

        for (String line : ics.split("\r\n")) {
            assertThat(line.getBytes(StandardCharsets.UTF_8).length)
                    .as("Aucune ligne ne doit dépasser 75 octets")
                    .isLessThanOrEqualTo(75);
        }
        // La continuation d'une ligne pliée commence par une espace.
        assertThat(ics).contains("\r\n x");
    }

    @Test
    @DisplayName("Le calendrier REQUEST porte METHOD:REQUEST et les ATTENDEE")
    void requestCalendarHasAttendees() {
        String ics = writer.buildRequestCalendar(
                List.of(sampleEvent("Atelier", "Desc", List.of("a@esprit.tn", "b@esprit.tn"))));
        // Dépliage RFC 5545 (« line unfolding ») avant assertion, comme le ferait un client.
        String unfolded = ics.replace("\r\n ", "");

        assertThat(unfolded)
                .contains("METHOD:REQUEST")
                .contains("ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:a@esprit.tn")
                .contains("ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:b@esprit.tn")
                .contains("SEQUENCE:0");
    }
}
