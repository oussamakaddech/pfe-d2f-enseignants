package tn.esprit.d2f.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Événement publié sur RabbitMQ lorsqu'un besoin de formation est intégralement approuvé
 * (3 niveaux : CUP → ChefDep → Admin).
 *
 * <p>Règles DSI §4 — sécurité des événements :</p>
 * <ul>
 *   <li>Aucun mot de passe, token ou secret dans le payload</li>
 *   <li>Le champ {@code username} est l'identifiant fonctionnel de l'enseignant (non-PII au sens RGPD)</li>
 *   <li>{@code approvedAt} : horodatage UTC ISO-8601 pour traçabilité</li>
 * </ul>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Événement RabbitMQ émis à la validation complète d'un besoin de formation")
public class BesoinFormationApprovedEvent implements Serializable {

    @Schema(description = "Identifiant technique du besoin", example = "42")
    private Long idBesoinFormation;

    @Schema(description = "Identifiant fonctionnel de l'enseignant", example = "jdupont")
    private String username;

    @Schema(description = "Horodatage UTC ISO-8601 de l'approbation finale", example = "2026-05-23T14:30:00.000Z")
    private String approvedAt;

    @Schema(description = "Type de besoin (enum name)", example = "INTERNE")
    private String typeBesoin;

    @Schema(description = "Titre du besoin")
    private String titre;

    @Schema(description = "Thème de la formation")
    private String theme;

    @Schema(description = "Objectif principal de la formation")
    private String objectifFormation;

    private String objectifsOperationnels;
    private String objectifsPedagogiques;
    private String methodesPedagogiques;
    private String moyensPedagogiques;
    private String methodesEvaluationAcquis;
    private String profilFormateur;
    private String propositionAnimateur;
    private String prerequis;
    private String publicCible;
    private Integer nbMaxParticipants;
    private String programmeFormation;
    private Integer dureeFormation;
    private String horaireSouhaite;
    private String up;
    private String departement;
    private String periodCode;
    private String customPeriodLabel;
    private String dateDebut;
    private String dateFin;
}

