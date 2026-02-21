package tn.esprit.d2f.competence.dto;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DomaineDTO {
    private Long id;
    private String code;
    private String nom;
    private String description;
    private Boolean actif;
    private List<CompetenceDTO> competences;
}
