package tn.esprit.d2f.competence.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.List;

@Getter
@Setter
@EqualsAndHashCode(of = "id")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CompetenceDTO {
    private Long id;
    private String code;
    private String nom;
    private String description;
    private String prerequisiteManual;
    private Integer ordre;
    private Long domaineId;
    private String domaineNom;
    private Long nbEnseignants;
    private Long prerequisiteCount;
    private List<String> prerequisiteNames;
    private List<SousCompetenceDTO> sousCompetences;
    private List<SavoirDTO> savoirs;
}
