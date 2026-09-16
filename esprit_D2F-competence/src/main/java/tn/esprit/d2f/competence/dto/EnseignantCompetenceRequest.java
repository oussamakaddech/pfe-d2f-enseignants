package tn.esprit.d2f.competence.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnseignantCompetenceRequest {

    @NotBlank(message = "L'identifiant de l'enseignant est obligatoire")
    private String enseignantId;

    @NotNull(message = "L'identifiant du savoir est obligatoire")
    private Long savoirId;

    @NotNull(message = "Le niveau de maîtrise est obligatoire")
    private NiveauMaitrise niveau;

    private LocalDate dateAcquisition;

    private String commentaire;
}
