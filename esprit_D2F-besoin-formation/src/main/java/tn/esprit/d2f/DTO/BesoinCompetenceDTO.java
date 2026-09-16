package tn.esprit.d2f.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BesoinCompetenceDTO {
    private Long id;
    private Long besoinId;
    private Long domaineId;
    private Long competenceId;
    private String competenceNom;
    private Long savoirId;
    private String savoirNom;
    private Long sousCompetenceId;
}
