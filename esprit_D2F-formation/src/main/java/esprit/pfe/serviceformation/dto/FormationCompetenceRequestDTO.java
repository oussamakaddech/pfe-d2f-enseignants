package esprit.pfe.serviceformation.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * DTO de requête pour la liaison Formation-Competence (DSI #7 : ne jamais
 * liaison l'entité JPA brute en entrée d'API). Les noms de champs correspondent
 * exactement à ceux de l'entité pour préserver le contrat JSON du front-end.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FormationCompetenceRequestDTO implements Serializable {

    private Long domaineId;

    @NotNull
    private Long competenceId;

    private String competenceNom;

    private Long sousCompetenceId;

    private String sousCompetenceNom;

    private Long savoirId;

    private String savoirNom;

    private String savoirType;

    private Integer niveauPrerequis;

    private Integer niveauVise;
}
