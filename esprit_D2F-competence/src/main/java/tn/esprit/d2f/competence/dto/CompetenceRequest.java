package tn.esprit.d2f.competence.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompetenceRequest {

    @NotBlank(message = "Le code est obligatoire")
    @Size(max = 20, message = "Le code ne doit pas dépasser 20 caractères")
    private String code;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 150, message = "Le nom ne doit pas dépasser 150 caractères")
    private String nom;

    @Size(max = 500, message = "La description ne doit pas dépasser 500 caractères")
    private String description;

    @Positive(message = "L'ordre doit être un entier positif")
    private Integer ordre;
}
