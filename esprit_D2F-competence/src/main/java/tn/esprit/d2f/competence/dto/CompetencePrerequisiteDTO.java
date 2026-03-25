package tn.esprit.d2f.competence.dto;

import lombok.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompetencePrerequisiteDTO {
    private Long id;
    private Long competenceId;
    private String competenceNom;
    private Long prerequisiteId;
    private String prerequisiteNom;
    private String prerequisiteCode;
    private NiveauMaitrise niveauMinimum;
    private String niveauMinimumLabel;
    private String description;
    private LocalDateTime createdAt;

    public CompetencePrerequisiteDTO(Long id,
                                     Long competenceId,
                                     String competenceNom,
                                     Long prerequisiteId,
                                     String prerequisiteNom,
                                     String prerequisiteCode,
                                     NiveauMaitrise niveauMinimum,
                                     String description,
                                     LocalDateTime createdAt) {
        this.id = id;
        this.competenceId = competenceId;
        this.competenceNom = competenceNom;
        this.prerequisiteId = prerequisiteId;
        this.prerequisiteNom = prerequisiteNom;
        this.prerequisiteCode = prerequisiteCode;
        this.niveauMinimum = niveauMinimum;
        this.description = description;
        this.createdAt = createdAt;
    }
}
