package esprit.pfe.serviceformation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Corps de requête envoyé à auth POST /api/v1/account/summaries. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountSummaryRequest {
    private List<String> userIds;
    private String role;
    private Boolean active;
}
