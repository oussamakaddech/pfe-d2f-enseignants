package esprit.pfe.serviceanalyse.dto.passport;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Représente un savoir (théorique/pratique/être) maîtrisé par l'enseignant.
 * Exemple JSON :
 * { "code": "SC-JAVA-01", "nom": "Programmation objet", "type": "SAVOIR",
 *   "niveau": "N3_INTERMEDIAIRE", "niveauLabel": "N3 – Intermédiaire",
 *   "dateAcquisition": "2024-09-01" }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SavoirSummaryDTO {
    private Long savoirId;
    private String code;
    private String nom;
    private String type;
    private String niveau;
    private String niveauLabel;
    private int niveauNumeric;
    private LocalDate dateAcquisition;
}
