package tn.esprit.d2f.competence.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;

@Getter
@Setter
@EqualsAndHashCode(of = "id")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SavoirDTO {
    private Long id;
    private String code;
    private String nom;
    private String description;
    private TypeSavoir type;
    private NiveauMaitrise niveau;
    private Long sousCompetenceId;
    private String sousCompetenceNom;
    private Long competenceId;
    private String competenceNom;
}
