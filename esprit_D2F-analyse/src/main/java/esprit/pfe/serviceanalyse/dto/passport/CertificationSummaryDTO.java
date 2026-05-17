package esprit.pfe.serviceanalyse.dto.passport;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Certification obtenue par l'enseignant.
 * Exemple JSON :
 * { "certificatId": 5, "titreFormation": "Spring Boot Avancé",
 *   "typeCertif": "CERTIF", "dateObtention": "2024-02-10" }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CertificationSummaryDTO {
    private Long certificatId;
    private String titreFormation;
    private String typeCertif;
    private String dateObtention;
}
