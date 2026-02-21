package tn.esprit.d2f.competence.dto;

import lombok.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnseignantCompetenceDTO {
    private Long id;
    private String enseignantId;
    private Long savoirId;
    private String savoirNom;
    private String savoirCode;
    private String sousCompetenceNom;
    private String competenceNom;
    private String domaineNom;
    private NiveauMaitrise niveau;
    private LocalDate dateAcquisition;
    private String commentaire;
}
