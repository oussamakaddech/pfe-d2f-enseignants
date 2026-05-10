package esprit.pfe.serviceevaluation.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationFormateurDTO {
    private Long idEvalParticipant;

    @NotBlank(message = "L'ID de l'enseignant est obligatoire")
    private String enseignantId;

    @NotNull(message = "L'ID de la formation est obligatoire")
    private Long formationId;

    @Min(value = 0, message = "La note minimale est 0")
    @Max(value = 20, message = "La note maximale est 20")
    private float note;

    private boolean satisfaisant;

    @Size(max = 500, message = "Le commentaire ne doit pas dépasser 500 caractères")
    private String commentaire;
}
