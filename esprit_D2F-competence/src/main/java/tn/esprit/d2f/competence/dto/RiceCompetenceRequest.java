package tn.esprit.d2f.competence.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiceCompetenceRequest {

    @NotBlank
    private String code;

    @NotBlank
    private String nom;

    private String description;
    private Integer ordre;

    /** Rattachements optionnels transmis lors de la revue RICE. */
    private List<String> upIds;
    private List<String> departementIds;

    @Valid
    private List<RiceSavoirRequest> savoirs;

    @Valid
    private List<RiceSousCompetenceRequest> sousCompetences;
}
