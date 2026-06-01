package esprit.pfe.serviceanalyse.dto.passport;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Formation suivie ou en cours par l'enseignant.
 * Exemple JSON :
 * { "formationId": "10", "titre": "Spring Boot 3 Avancé",
 *   "dateDebut": "2024-01-15", "dateFin": "2024-02-10",
 *   "duree": "40h", "statut": "TERMINEE", "competencesCiblees": ["Spring", "Microservices"] }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TrainingHistoryDTO {
    private String formationId;
    private String titre;
    private String dateDebut;
    private String dateFin;
    private String duree;
    private String statut;
    private List<String> competencesCiblees;
}
