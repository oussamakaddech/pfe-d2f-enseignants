package tn.esprit.d2f.competence.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

@Getter
@Setter
@EqualsAndHashCode(of = "id")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NiveauSavoirRequisDTO {
    private Long id;
    private Long competenceId;
    private String competenceNom;
    private Long sousCompetenceId;
    private String sousCompetenceNom;
    private NiveauMaitrise niveau;
    private Long savoirId;
    private String savoirNom;
    private String savoirCode;
    private String description;
}
