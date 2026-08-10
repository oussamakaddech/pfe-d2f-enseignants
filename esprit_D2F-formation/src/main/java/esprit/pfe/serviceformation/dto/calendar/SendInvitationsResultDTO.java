package esprit.pfe.serviceformation.dto.calendar;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Résultat (synchrone) du déclenchement d'un envoi d'invitations. L'envoi
 * effectif est asynchrone : ce DTO rend compte du nombre de destinataires
 * dispatchés vers la file d'envoi.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendInvitationsResultDTO {

    private Long formationId;
    @Builder.Default
    private int formationsProcessed = 0;
    @Builder.Default
    private int recipientsDispatched = 0;

    /** DISPATCHED ou NO_RECIPIENT. */
    private String status;
    private String message;
}
