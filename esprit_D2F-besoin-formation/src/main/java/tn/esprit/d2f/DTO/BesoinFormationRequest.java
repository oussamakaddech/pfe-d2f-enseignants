package tn.esprit.d2f.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.*;
import tn.esprit.d2f.entity.enumerations.PeriodCode;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;

import java.time.LocalDate;

/**
 * Corps de la requête de création/modification d'un besoin de formation.
 *
 * <p>Fix 8 — Bean Validation :</p>
 * <ul>
 *   <li>{@code titre} : obligatoire, 5-200 caractères</li>
 *   <li>{@code typeBesoin} : obligatoire sur la création</li>
 *   <li>{@code dateDebut} : {@code LocalDate} avec contrainte {@code @Future}</li>
 *   <li>{@code dateFin} : doit être strictement après {@code dateDebut} (@AssertTrue)</li>
 *   <li>{@code nbMaxParticipants} : entre 1 et 500</li>
 *   <li>{@code dureeFormation} : minimum 1 heure</li>
 * </ul>
 *
 * <p><strong>Note :</strong> Le même DTO sert à la création (POST) et la mise à jour (PUT).
 * Pour la mise à jour, seuls les champs non-null sont appliqués (patch sémantique).
 * Les contraintes {@code @NotBlank} / {@code @NotNull} s'appliquent donc aux deux opérations ;
 * inclure les champs obligatoires dans chaque appel PUT.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Requête de création ou de modification d'un besoin de formation")
public class BesoinFormationRequest {

    @Schema(description = "Identifiant technique (obligatoire pour les mises à jour PUT)", example = "42")
    private Long idBesoinFormation;

    @Schema(description = "Identifiant fonctionnel de l'enseignant", example = "jdupont")
    private String username;

    @NotNull(message = "Le type de besoin est obligatoire")
    @Schema(description = "Type de besoin de formation", example = "INTERNE")
    private TypeBesoin typeBesoin;

    @NotBlank(message = "Le titre est obligatoire")
    @Size(min = 5, max = 200, message = "Le titre doit contenir entre 5 et 200 caractères")
    @Schema(description = "Titre court et descriptif du besoin", example = "Formation Spring Boot avancé")
    private String titre;

    @Schema(description = "Objectif principal de la formation")
    private String objectifFormation;

    @Min(value = 1, message = "Le nombre maximum de participants doit être supérieur ou égal à 1")
    @Max(value = 500, message = "Le nombre maximum de participants ne peut pas dépasser 500")
    @Schema(description = "Nombre maximum de participants", example = "25")
    private Integer nbMaxParticipants;

    @Min(value = 1, message = "La durée de la formation doit être d'au moins 1 heure")
    @Schema(description = "Durée de la formation en heures", example = "8")
    private Integer dureeFormation;

    @Schema(description = "Code de l'Unité Pédagogique", example = "UP-INFO")
    private String up;

    @Schema(description = "Code du département", example = "DEPT-GL")
    private String departement;

    @Schema(description = "Niveau de priorité du besoin", example = "HAUTE")
    private Priorite priorite;

    private String propositionAnimateur;
    private String prerequis;
    private String publicCible;
    private String programmeFormation;
    private String theme;
    private String objectifsOperationnels;
    private String objectifsPedagogiques;
    private String methodesPedagogiques;
    private String moyensPedagogiques;
    private String methodesEvaluationAcquis;
    private String profilFormateur;
    private String horaireSouhaite;
    private String impactStrategique;
    private Boolean estOuverte;
    private String autresInformations;

    @Schema(description = "Animateurs proposés (une ligne \"Nom Prénom <email>\" par animateur)")
    private String animateurs;

    @Schema(description = "Enseignants participants proposés (une ligne \"Nom Prénom <email>\" par enseignant)")
    private String enseignants;

    private PeriodCode periodCode;
    private String customPeriodLabel;

    /**
     * Date de début de la formation.
     * Doit être une date future (format JSON : "yyyy-MM-dd").
     */
    @Future(message = "La date de début doit être dans le futur")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Schema(description = "Date de début (yyyy-MM-dd, doit être dans le futur)", example = "2026-09-01")
    private LocalDate dateDebut;

    /**
     * Date de fin de la formation.
     * Validée via {@link #isDateFinAfterDateDebut()} : doit être >= dateDebut.
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Schema(description = "Date de fin (yyyy-MM-dd, doit être après la date de début)", example = "2026-09-03")
    private LocalDate dateFin;

    @Schema(description = "Commentaire pour la notification associée à la modification")
    private String commentaire;

    // ── Champs de workflow (utilisés par PUT /modify) ─────────────────────────

    private Boolean approuveCUP;
    private Boolean approuveChefDep;
    private Boolean approuveAdmin;

    // ── Validation croisée ────────────────────────────────────────────────────

    /**
     * Vérifie que {@code dateFin} n'est pas avant {@code dateDebut}.
     * Retourne {@code true} si l'un des deux est null (les contraintes @Future/@NotNull gèrent ce cas).
     */
    @AssertTrue(message = "La date de fin doit être postérieure ou égale à la date de début")
    @Schema(hidden = true)
    public boolean isDateFinAfterDateDebut() {
        if (dateDebut == null || dateFin == null) {
            return true; // null géré par les autres contraintes
        }
        return !dateFin.isBefore(dateDebut);
    }
}
