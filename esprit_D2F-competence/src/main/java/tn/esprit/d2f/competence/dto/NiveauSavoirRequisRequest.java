package tn.esprit.d2f.competence.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NiveauSavoirRequisRequest {

    /** Compétence (remplir soit competenceId, soit sousCompetenceId) */
    private Long competenceId;

    /** Sous-compétence (remplir soit competenceId, soit sousCompetenceId) */
    private Long sousCompetenceId;

    @NotNull(message = "Le niveau est obligatoire")
    private NiveauMaitrise niveau;

    @NotNull(message = "Le savoir est obligatoire")
    private Long savoirId;

    private String description;
}
