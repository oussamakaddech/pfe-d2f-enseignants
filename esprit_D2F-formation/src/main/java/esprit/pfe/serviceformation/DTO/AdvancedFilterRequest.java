package esprit.pfe.serviceformation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Critères de filtrage avancé de la page de gestion unifiée.
 * Le tri (sortBy) est validé contre une liste blanche côté service (anti-injection).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "AdvancedFilterRequest", description = "Filtres avancés des profils unifiés")
public class AdvancedFilterRequest {

    @Schema(description = "Recherche libre : nom, prénom, email, matricule")
    private String search;

    @Schema(description = "Filtre par rôle de compte",
            allowableValues = {"ADMIN", "CUP", "ENSEIGNANT", "FORMATEUR", "ANIMATEUR",
                    "CHEF_DEPARTEMENT", "RESPONSABLE_DOSSIER"})
    private String role;

    @Schema(description = "Filtre par département (id)")
    private String departementId;

    @Schema(description = "Filtre par UP (id)")
    private String upId;

    @Schema(description = "Filtre par grade")
    private String grade;

    @Schema(description = "Filtre par statut enseignant (etat), ex. A")
    private String statut;

    @Schema(description = "Filtre par statut de dossier (RESPONSABLE_DOSSIER)")
    private String dossierStatus;

    @Schema(description = "Filtre par compte actif (true=actif, false=désactivé)")
    private Boolean isActive;

    @Schema(description = "Recrutement à partir de (incluse)", example = "2020-01-01")
    private LocalDate recruitedFrom;

    @Schema(description = "Recrutement jusqu'à (incluse)", example = "2024-12-31")
    private LocalDate recruitedTo;

    @Schema(description = "Champ de tri",
            example = "nom",
            allowableValues = {"nom", "prenom", "mail", "grade", "dateRecrutement", "etat", "createdAt"})
    private String sortBy;

    @Schema(description = "Direction de tri", example = "ASC", allowableValues = {"ASC", "DESC"})
    private String sortDirection;

    @Schema(description = "Page (0-based)", example = "0")
    private Integer page;

    @Schema(description = "Taille de page", example = "20")
    private Integer size;
}
