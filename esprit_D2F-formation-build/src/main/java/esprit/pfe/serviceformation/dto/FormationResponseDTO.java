package esprit.pfe.serviceformation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for Formation entity.
 * Contains all formation details without exposing unnecessary internal fields.
 * Implements Serializable for cache compatibility.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(name = "FormationResponseDTO", description = "Complete formation details")
public class FormationResponseDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "Formation ID", example = "42")
    private Long idFormation;

    @Schema(description = "Formation title", example = "Gestion de projet Agile")
    private String titreFormation;

    @Schema(description = "Formation type (INTERNE, EXTERNE, MIXTE)", example = "INTERNE")
    private String typeFormation;

    @Schema(description = "Formation state", example = "PLANIFIEE")
    private String etatFormation;

    @Schema(description = "Start date", example = "2026-06-15")
    private LocalDate dateDebut;

    @Schema(description = "End date", example = "2026-06-20")
    private LocalDate dateFin;

    @Schema(description = "Total training hours", example = "24")
    private Integer chargeHoraireGlobal;

    @Schema(description = "Formation objectives")
    private String objectifs;

    @Schema(description = "Pedagogical objectives")
    private String objectifsPedago;

    @Schema(description = "Evaluation methods")
    private String evalMethods;

    @Schema(description = "Formation cost", example = "5000.00")
    private Float coutFormation;

    @Schema(description = "Transport cost", example = "500.00")
    private Float coutTransport;

    @Schema(description = "Accommodation cost", example = "1000.00")
    private Float coutHebergement;

    @Schema(description = "Meals cost", example = "300.00")
    private Float coutRepas;

    @Schema(description = "Training domain")
    private String domaine;

    @Schema(description = "Associated competence")
    private String competence;

    @Schema(description = "Target population")
    private String populationCible;

    @Schema(description = "Prerequisites")
    private String prerequis;

    @Schema(description = "Expected outcomes")
    private String acquis;

    @Schema(description = "Performance indicators")
    private String indicateurs;

    @Schema(description = "External trainer last name")
    private String externeFormateurNom;

    @Schema(description = "External trainer first name")
    private String externeFormateurPrenom;

    @Schema(description = "External trainer email")
    private String externeFormateurEmail;

    @Schema(description = "External organization reference")
    private String organismeRefExterne;

    @Schema(description = "Training office name")
    private String bureauFormationNom;

    @Schema(description = "Training office email")
    private String bureauFormationMail;

    @Schema(description = "Training office phone")
    private String bureauFormationTelephone;

    @Schema(description = "Training room/location")
    private String salle;

    @Schema(description = "Period code")
    private String periodCode;

    @Schema(description = "Custom period label")
    private String customPeriodLabel;

    @Schema(description = "Is formation open for enrollment")
    private boolean ouverte;

    @Schema(description = "Are inscriptions open")
    private boolean inscriptionsOuvertes;

    @Schema(description = "Is certificate generated")
    private boolean certifGenerated;

    @Schema(description = "UP details")
    private UpDTO up;

    @Schema(description = "Department details")
    private DeptDTO departement;

    @Schema(description = "List of sessions")
    private List<SeanceDTO> seances;

    @Schema(description = "List of trainers/animateurs")
    private List<EnseignantDTO> animateurs;

    @Schema(description = "List of competences")
    private List<FormationCompetenceDTO> formationCompetences;

    @Schema(description = "List of documents")
    private List<DocumentDTO> documents;

    @Schema(description = "Number of enrollments")
    private Long inscriptionCount;

    @Schema(description = "Creation timestamp")
    private LocalDateTime createdAt;

    @Schema(description = "Last update timestamp")
    private LocalDateTime updatedAt;

    @Schema(description = "Created by (user ID)")
    private String createdBy;

    @Schema(description = "Updated by (user ID)")
    private String updatedBy;
}
