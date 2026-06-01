package esprit.pfe.serviceformation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO for updating an existing formation.
 * All fields are optional (partial update support).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(name = "UpdateFormationRequest", description = "Request to update a formation (partial updates allowed)")
public class UpdateFormationRequest {

    @Size(min = 3, max = 255, message = "Le titre doit avoir entre 3 et 255 caractères")
    @Schema(description = "Formation title")
    private String titreFormation;

    @FutureOrPresent(message = "La date de début doit être aujourd'hui ou dans le futur")
    @Schema(description = "Formation start date")
    private LocalDate dateDebut;

    @FutureOrPresent(message = "La date de fin doit être aujourd'hui ou dans le futur")
    @Schema(description = "Formation end date")
    private LocalDate dateFin;

    @Schema(description = "Formation type (INTERNE, EXTERNE, MIXTE)")
    private String typeFormation;

    @Schema(description = "Formation state (PLANIFIEE, EN_COURS, ANNULEE, ACHEVEE)")
    private String etatFormation;

    @PositiveOrZero(message = "La charge horaire doit être positive")
    @Schema(description = "Total training hours")
    private Integer chargeHoraireGlobal;

    @Size(max = 2000, message = "Les objectifs ne doivent pas dépasser 2000 caractères")
    @Schema(description = "Formation objectives")
    private String objectifs;

    @Size(max = 2000, message = "Les objectifs pédagogiques ne doivent pas dépasser 2000 caractères")
    @Schema(description = "Pedagogical objectives")
    private String objectifsPedago;

    @Size(max = 2000, message = "Les critères d'évaluation ne doivent pas dépasser 2000 caractères")
    @Schema(description = "Evaluation methods")
    private String evalMethods;

    @PositiveOrZero(message = "Le coût formation doit être positif")
    @Schema(description = "Formation cost")
    private Float coutFormation;

    @PositiveOrZero(message = "Le coût transport doit être positif")
    @Schema(description = "Transport cost")
    private Float coutTransport;

    @PositiveOrZero(message = "Le coût hébergement doit être positif")
    @Schema(description = "Accommodation cost")
    private Float coutHebergement;

    @PositiveOrZero(message = "Le coût repas doit être positif")
    @Schema(description = "Meals cost")
    private Float coutRepas;

    @Size(max = 255, message = "Le domaine ne doit pas dépasser 255 caractères")
    @Schema(description = "Training domain")
    private String domaine;

    @Size(max = 255, message = "La compétence ne doit pas dépasser 255 caractères")
    @Schema(description = "Associated competence")
    private String competence;

    @Size(max = 255, message = "La population cible ne doit pas dépasser 255 caractères")
    @Schema(description = "Target population")
    private String populationCible;

    @Size(max = 2000, message = "Les prérequis ne doivent pas dépasser 2000 caractères")
    @Schema(description = "Prerequisites")
    private String prerequis;

    @Size(max = 2000, message = "Les acquis ne doivent pas dépasser 2000 caractères")
    @Schema(description = "Expected outcomes")
    private String acquis;

    @Size(max = 2000, message = "Les indicateurs ne doivent pas dépasser 2000 caractères")
    @Schema(description = "Performance indicators")
    private String indicateurs;

    @Size(max = 100, message = "Le nom du formateur externe ne doit pas dépasser 100 caractères")
    @Schema(description = "External trainer last name")
    private String externeFormateurNom;

    @Size(max = 100, message = "Le prénom du formateur externe ne doit pas dépasser 100 caractères")
    @Schema(description = "External trainer first name")
    private String externeFormateurPrenom;

    @Email(message = "L'email du formateur externe doit être valide")
    @Schema(description = "External trainer email")
    private String externeFormateurEmail;

    @Size(max = 255, message = "L'organisme de référence ne doit pas dépasser 255 caractères")
    @Schema(description = "External organization reference")
    private String organismeRefExterne;

    @Size(max = 255, message = "Le nom du bureau de formation ne doit pas dépasser 255 caractères")
    @Schema(description = "Training office name")
    private String bureauFormationNom;

    @Email(message = "L'email du bureau de formation doit être valide")
    @Schema(description = "Training office email")
    private String bureauFormationMail;

    @Size(max = 50, message = "Le téléphone ne doit pas dépasser 50 caractères")
    @Schema(description = "Training office phone")
    private String bureauFormationTelephone;

    @Size(max = 255, message = "La salle ne doit pas dépasser 255 caractères")
    @Schema(description = "Training room/location")
    private String salle;

    @Size(max = 50, message = "Le code période ne doit pas dépasser 50 caractères")
    @Schema(description = "Period code")
    private String periodCode;

    @Size(max = 255, message = "Le label période ne doit pas dépasser 255 caractères")
    @Schema(description = "Custom period label")
    private String customPeriodLabel;

    @Schema(description = "UP ID")
    private Long upId;

    @Schema(description = "Department ID")
    private Long departementId;
}
