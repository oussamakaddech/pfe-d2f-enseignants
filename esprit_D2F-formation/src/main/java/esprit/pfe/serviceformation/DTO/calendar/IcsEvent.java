package esprit.pfe.serviceformation.dto.calendar;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Représentation neutre d'un évènement à sérialiser en VEVENT (RFC 5545).
 * Les dates/heures sont locales au fuseau configuré ({@code calendar.timezone}).
 */
@Value
@Builder
public class IcsEvent {

    /** Identifiant unique et stable de l'évènement (UID, sans le domaine). */
    String uid;

    /** Début (heure locale du fuseau configuré). */
    LocalDateTime start;

    /** Fin (heure locale du fuseau configuré). */
    LocalDateTime end;

    /** Titre (SUMMARY). */
    String summary;

    /** Description multi-lignes (DESCRIPTION). */
    String description;

    /** Lieu / salle (LOCATION). */
    String location;

    /** Statut RFC 5545 : CONFIRMED, TENTATIVE ou CANCELLED. */
    @Builder.Default
    String status = "CONFIRMED";

    /** Adresses des participants (ATTENDEE) — utilisé pour METHOD:REQUEST. */
    List<String> attendeeEmails;
}
