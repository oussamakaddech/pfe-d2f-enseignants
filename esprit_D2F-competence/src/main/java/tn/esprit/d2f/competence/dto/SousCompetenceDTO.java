package tn.esprit.d2f.competence.dto;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SousCompetenceDTO {
    private Long id;
    private String code;
    private String nom;
    private String description;
    private Long competenceId;
    private String competenceNom;
    private List<SavoirDTO> savoirs;
}
