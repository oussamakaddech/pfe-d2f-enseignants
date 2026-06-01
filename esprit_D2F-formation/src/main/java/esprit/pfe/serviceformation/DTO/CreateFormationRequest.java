package esprit.pfe.serviceformation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO for creating a new formation.
 * Validates all required and optional fields.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(name = "CreateFormationRequest", description = "Request to create a new formation")
public class CreateFormationRequest {

    @NotBlank(message = "Le titre de la formation est obligatoire")
    @Size(min = 3, max = 255, message = "Le titre doit avoir entre 3 et 255 caractères")
    @Schema(description = "Formation title", example = "Gestion de projet Agile")
    private String titreFormation;

    @NotNull(message = "La date de début est obligatoire")
    @FutureOrPresent(message = "La date de début doit être aujourd'hui ou dans le futur")
    @Schema(description = "Formation start date", example = "2026-06-15")
    private LocalDate dateDebut;

    @NotNull(message = "La date de fin est obligatoire")
    @FutureOrPresent(message = "La date de fin doit être aujourd'hui ou dans le futur")
    @Schema(description = "Formation end date", example = "2026-06-20")
    private LocalDate dateFin;

    @NotNull(message = "Le type de formation est obligatoire")
    @Schema(description = "Formation type (INTERNE, EXTERNE, MIXTE)", example = "INTERNE")
    private String typeFormation;

    @NotNull(message = "L'état de la formation est obligatoire")
    @Schema(description = "Formation state (PLANIFIEE, EN_COURS, ANNULEE, ACHEVEE)", example = "PLANIFIEE")
    private String etatFormation;

    @PositiveOrZero(message = "La charge horaire doit être positive")
    @Schema(description = "Total training hours", example = "24")
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
    @Schema(description = "Formation cost", example = "5000.00")
    private Float coutFormation;

    @PositiveOrZero(message = "Le coût transport doit être positif")
    @Schema(description = "Transport cost", example = "500.00")
    private Float coutTransport;

    @PositiveOrZero(message = "Le coût hébergement doit être positif")
    @Schema(description = "Accommodation cost", example = "1000.00")
    private Float coutHebergement;

    @PositiveOrZero(message = "Le coût repas doit être positif")
    @Schema(description = "Meals cost", example = "300.00")
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

    @Schema(description = "UP ID", example = "1")
    private Long upId;

    @Schema(description = "Department ID")
    private Long departementId;

    /**
     * Validates that dateDebut < dateFin
     * Must be called by service after object creation
     */
    @AssertTrue(message = "La date de fin doit être après la date de début")
    public boolean isDateRangeValid() {
        if (dateDebut == null || dateFin == null) {
            return true; // Will be caught by @NotNull
        }
        return dateFin.isAfter(dateDebut);
    }
}
