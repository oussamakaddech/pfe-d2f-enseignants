package esprit.pfe.serviceformation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Legacy DTO for Formation - kept for backward compatibility.
 * New code should use FormationResponseDTO and CreateFormationRequest/UpdateFormationRequest.
 * This DTO is deprecated and should not be used for new endpoints.
 *
 * @deprecated Use FormationResponseDTO, CreateFormationRequest, or UpdateFormationRequest instead
 */
@Deprecated(since = "2026-05", forRemoval = true)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(name = "FormationDTO (Deprecated)", description = "Legacy formation DTO - use FormationResponseDTO instead")
public class FormationDTO {

    private Long idFormation;
    private String typeBesoin;
    private Long idBesoinFormation;
    private String titreFormation;
    private String typeFormation;
    private LocalDate dateDebut;
    private LocalDate dateFin;
    private String etatFormation;
    private Float coutFormation;
    private String organismeRefExterne;
    private String externeFormateurNom;
    private String externeFormateurPrenom;
    private String externeFormateurEmail;
    private String bureauFormationNom;
    private String bureauFormationMail;
    private String bureauFormationTelephone;
    private Integer chargeHoraireGlobal;
    private String domaine;
    private String competence;
    private String populationCible;
    private String objectifs;
    private String objectifsPedago;
    private String evalMethods;
    private Float coutTransport;
    private Float coutHebergement;
    private Float coutRepas;
    private String prerequis;
    private String acquis;
    private String indicateurs;

    // Fixed: Removed duplicate fields (departement1, up1)
    private DeptDTO departement;
    private UpDTO up;

    private List<SeanceDTO> seances;
    private List<EnseignantDTO> animateurs;

    private boolean ouverte;
    private boolean inscriptionsOuvertes;
    private boolean certifGenerated;
    private String periodCode;
    private String customPeriodLabel;
}

