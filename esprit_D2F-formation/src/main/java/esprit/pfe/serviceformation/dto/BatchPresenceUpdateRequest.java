package esprit.pfe.serviceformation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.time.LocalTime;
import esprit.pfe.serviceformation.entities.PresenceStatus;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BatchPresenceUpdateRequest {

    private List<Item> updates;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Item {
        private Long idParticipation;
        private boolean present;
        private PresenceStatus status;
        private LocalTime arrivalTime;
        private LocalTime departureTime;
        private String justification;
        private String commentaire;

        public Item(Long idParticipation, boolean present, String commentaire) {
            this.idParticipation = idParticipation;
            this.present = present;
            this.commentaire = commentaire;
        }
    }
}
