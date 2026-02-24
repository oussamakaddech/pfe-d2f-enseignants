package tn.esprit.d2f.competence.dto;

import lombok.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
