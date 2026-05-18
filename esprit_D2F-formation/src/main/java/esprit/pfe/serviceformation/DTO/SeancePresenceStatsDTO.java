package esprit.pfe.serviceformation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeancePresenceStatsDTO {
    private Long seanceId;
    private long total;
    private long presents;
    private long absents;
    private double tauxPresence;
}
