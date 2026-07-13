package tn.esprit.d2f.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import tn.esprit.d2f.entity.enumerations.NotificationSeverity;
import tn.esprit.d2f.entity.enumerations.NotificationType;

import java.io.Serializable;
import java.util.Map;

/**
 * Requête de création d'une notification (employée par les autres services et
 * par l'admin). Le destinataire est fourni explicitement ({@code recipient}).
 */
public record NotificationRequest(
        @NotBlank(message = "Le destinataire est obligatoire")
        String recipient,

        @NotNull(message = "Le type est obligatoire")
        NotificationType type,

        @NotNull(message = "La sévérité est obligatoire")
        NotificationSeverity severity,

        @NotBlank(message = "Le titre est obligatoire")
        String title,

        @NotBlank(message = "Le message est obligatoire")
        String message,

        String link,

        String actor,

        Map<String, Object> meta
) implements Serializable {
}
