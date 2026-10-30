package tn.esprit.d2f.competence.dto; // IDE refresh comment

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.List;

@Getter
@Setter
@EqualsAndHashCode(of = "id")
@NoArgsConstructor
@AllArgsConstructor
@Builder
/** DTO for Competence */
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
    /** Rattachement historique porté par le domaine (lecture seule, conservé pour compatibilité). */
    private String upId;
    private String departementId;
    /** UP auxquelles la compétence s'applique (choix multiple, optionnel). */
    private List<String> upIds;
    /** Départements auxquels la compétence s'applique (choix multiple, optionnel). */
    private List<String> departementIds;
    private Long nbEnseignants;
    private Long prerequisiteCount;
    private List<String> prerequisiteNames;
    private List<SousCompetenceDTO> sousCompetences;
    private List<SavoirDTO> savoirs;
}
