package tn.esprit.d2f.competence.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiceSavoirRequest {

    @NotBlank
    private String code;

    @NotBlank
    private String nom;

    private String description;

    @NotBlank
    private String type;      // THEORIQUE | PRATIQUE

    @NotBlank
    private String niveau;    // N1_DEBUTANT … N5_EXPERT

    /** Enseignant IDs that will receive this savoir as an assignment */
    private List<String> enseignantIds;
}
