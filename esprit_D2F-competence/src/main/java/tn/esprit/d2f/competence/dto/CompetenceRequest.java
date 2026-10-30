package tn.esprit.d2f.competence.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompetenceRequest {

    @NotBlank(message = "Le code est obligatoire")
    private String code;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 150, message = "Le nom ne doit pas dépasser 150 caractères")
    private String nom;

    @Size(max = 500, message = "La description ne doit pas dépasser 500 caractères")
    private String description;

    @Size(max = 2000, message = "Les prérequis manuels ne doivent pas dépasser 2000 caractères")
    private String prerequisiteManual;

    @Positive(message = "L'ordre doit être un entier positif")
    private Integer ordre;

    /** UP auxquelles la compétence s'applique (optionnel, choix multiple). */
    private List<String> upIds;

    /** Départements auxquels la compétence s'applique (optionnel, choix multiple). */
    private List<String> departementIds;
}
