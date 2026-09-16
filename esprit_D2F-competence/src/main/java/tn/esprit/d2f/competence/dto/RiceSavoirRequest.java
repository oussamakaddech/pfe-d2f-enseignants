package tn.esprit.d2f.competence.dto;

import jakarta.validation.constraints.NotBlank;
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
    private String niveau;    // N1_DEBUTANT ... N5_EXPERT

    /**
     * IDs des enseignants à affecter à ce savoir (issus de la validation humaine
     * après drag-&-drop dans l'interface RICE). Les IDs synthétiques "ext_*" et
     * "manual_*" (enseignants non identifiés) sont filtrés côté frontend avant l'envoi.
     */
    private List<String> enseignantIds;
}
