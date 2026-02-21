package tn.esprit.d2f.competence.dto;

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

    private List<RiceSousCompetenceRequest> sousCompetences;
}
