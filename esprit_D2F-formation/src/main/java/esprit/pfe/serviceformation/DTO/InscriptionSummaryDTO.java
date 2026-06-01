package esprit.pfe.serviceformation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO de résumé d'inscription destiné au Skill Passport (service-analyse).
 * Expose les informations de la formation reliée à l'inscription d'un enseignant,
 * dans un format plat lisible par le SkillPassportAssembler.
 *
 * Contrat stable : ne pas supprimer de champs sans coordination avec service-analyse.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InscriptionSummaryDTO {
    private String formationId;
    private String titreFormation;
    private String dateDebut;
    private String dateFin;
    private String chargeHoraire;
    private String etatFormation;
    private List<String> competencesCiblees;
}
