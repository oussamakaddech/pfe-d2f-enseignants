package tn.esprit.d2f.competence.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiceSousCompetenceRequest {

    @NotBlank
    private String code;

    @NotBlank
    private String nom;

    private String description;

    private List<RiceSavoirRequest> savoirs;
}
