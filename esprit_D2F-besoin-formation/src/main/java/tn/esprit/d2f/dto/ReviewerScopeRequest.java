package tn.esprit.d2f.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Assignation d'un périmètre validateur par l'administrateur. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Assignation du périmètre (UP / département) d'un validateur")
public class ReviewerScopeRequest {

        @NotBlank(message = "Le rôle est obligatoire (ENSEIGNANT, CUP ou CHEF_DEPARTEMENT)")
        @Pattern(regexp = "ENSEIGNANT|CUP|CHEF_DEPARTEMENT",
            message = "Rôle invalide : ENSEIGNANT, CUP ou CHEF_DEPARTEMENT attendu")
        @Schema(description = "Rôle du périmètre", example = "CUP",
            allowableValues = {"ENSEIGNANT", "CUP", "CHEF_DEPARTEMENT"})
    private String role;

    @Schema(description = "Code UP (obligatoire pour un CUP)", example = "UP_INFO")
    private String upCode;

    @Schema(description = "Code département (obligatoire pour un chef, recommandé pour un CUP)", example = "DEPT_GL")
    private String departmentCode;
}
