package tn.esprit.d2f.competence.dto;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompetenceDTO {
    private Long id;
    private String code;
    private String nom;
    private String description;
    private Integer ordre;
    private Long domaineId;
    private String domaineNom;
    private List<SousCompetenceDTO> sousCompetences;
}
