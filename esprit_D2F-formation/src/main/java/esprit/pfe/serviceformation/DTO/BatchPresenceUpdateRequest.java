package esprit.pfe.serviceformation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

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
        private String commentaire;
    }
}
