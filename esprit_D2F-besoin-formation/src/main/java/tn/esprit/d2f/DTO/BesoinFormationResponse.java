package tn.esprit.d2f.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import tn.esprit.d2f.entity.enumerations.PeriodCode;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;

import java.time.LocalDateTime;

/**
 * DTO de réponse pour un besoin de formation.
 *
 * <p>Fix 6 — Inclut les champs d'audit ({@code createdAt}, {@code updatedAt},
 * {@code createdBy}, {@code updatedBy}) pour la traçabilité complète (DSI §audit).</p>
 *
 * <p>Fix 13 — Toutes les propriétés sont annotées {@code @Schema} pour la documentation OpenAPI.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Représentation complète d'un besoin de formation")
public class BesoinFormationResponse {

    @Schema(description = "Identifiant technique", example = "42")
    private long idBesoinFormation;

    @Schema(description = "Identifiant fonctionnel de l'enseignant", example = "jdupont")
    private String username;

    @Schema(description = "Type de besoin (INTERNE / EXTERNE)", example = "INTERNE")
    private TypeBesoin typeBesoin;

    @Schema(description = "Titre du besoin", example = "Formation Spring Boot avancé")
    private String titre;

    @Schema(description = "Objectif principal")
    private String objectifFormation;

    private String propositionAnimateur;
    private String prerequis;
    private String publicCible;

    @Schema(description = "Nombre maximum de participants", example = "25")
    private Integer nbMaxParticipants;

    private String programmeFormation;

    @Schema(description = "Durée en heures", example = "8")
    private Integer dureeFormation;

    private String theme;
    private String objectifsOperationnels;
    private String objectifsPedagogiques;
    private String methodesPedagogiques;
    private String moyensPedagogiques;
    private String methodesEvaluationAcquis;
    private String profilFormateur;
    private String horaireSouhaite;

    @Schema(description = "Code de l'Unité Pédagogique", example = "UP-INFO")
    private String up;

    @Schema(description = "Code du département", example = "DEPT-GL")
    private String departement;

    // ── Workflow d'approbation ────────────────────────────────────────────────

    @Schema(description = "Approbation niveau 1 (CUP)", example = "true")
    private Boolean approuveCUP;

    @Schema(description = "Approbation niveau 2 (Chef de Département)", example = "false")
    private Boolean approuveChefDep;

    @Schema(description = "Approbation niveau 3 (Admin) — approbation finale", example = "false")
    private Boolean approuveAdmin;

    private String notificationMessage;

    @Schema(description = "Événement RabbitMQ publié (true = événement envoyé au service Formation)", example = "false")
    private Boolean eventPublished;

    // ── Priorité & planification ──────────────────────────────────────────────

    @Schema(description = "Niveau de priorité (HAUTE / MOYENNE / FAIBLE)", example = "HAUTE")
    private Priorite priorite;

    private String impactStrategique;
    private Boolean estOuverte;
    private String autresInformations;

    @Schema(description = "Code de période académique")
    private PeriodCode periodCode;

    private String customPeriodLabel;

    @Schema(description = "Animateurs proposés (une ligne \"Nom Prénom <email>\" par animateur)")
    private String animateurs;

    @Schema(description = "Enseignants participants proposés (une ligne \"Nom Prénom <email>\" par enseignant)")
    private String enseignants;

    @Schema(description = "Date de début (yyyy-MM-dd)", example = "2026-09-01")
    private String dateDebut;

    @Schema(description = "Date de fin (yyyy-MM-dd)", example = "2026-09-03")
    private String dateFin;

    // ── Champs d'audit (Fix 6) ────────────────────────────────────────────────

    @Schema(description = "Date/heure de création (UTC)", example = "2026-05-23T10:00:00")
    private LocalDateTime createdAt;

    @Schema(description = "Date/heure de dernière modification (UTC)", example = "2026-05-23T14:30:00")
    private LocalDateTime updatedAt;

    @Schema(description = "Créateur (username extrait du JWT)", example = "jdupont")
    private String createdBy;

    @Schema(description = "Dernier modificateur (username extrait du JWT)", example = "admin")
    private String updatedBy;
}
