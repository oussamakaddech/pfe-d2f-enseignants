package tn.esprit.d2f.competence.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SavoirRequest {

    @NotBlank(message = "Le code est obligatoire")
    @Size(max = 20, message = "Le code ne doit pas dépasser 20 caractères")
    private String code;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 150, message = "Le nom ne doit pas dépasser 150 caractères")
    private String nom;

    @Size(max = 500, message = "La description ne doit pas dépasser 500 caractères")
    private String description;

    @NotNull(message = "Le type est obligatoire")
    private TypeSavoir type;

    @Builder.Default
    private NiveauMaitrise niveau = NiveauMaitrise.N2_ELEMENTAIRE;
}
