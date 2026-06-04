package esprit.pfe.serviceformation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Profil unifié = fiche enseignant (service formation) enrichie des données de
 * compte (rôle, statut actif) provenant du service auth via Feign.
 * Ne contient AUCUNE donnée sensible (jamais de hash de mot de passe).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "UnifiedProfileDTO", description = "Profil unifié compte + enseignant")
public class UnifiedProfileDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "Identifiant enseignant (matricule)", example = "E12345")
    private String id;

    @Schema(description = "Identifiant du compte auth lié", example = "9d1f-...")
    private String userId;

    private String matricule;
    private String nom;
    private String prenom;
    private String email;

    @Schema(description = "Rôle du compte",
            example = "ENSEIGNANT",
            allowableValues = {"ADMIN", "CUP", "D2F", "ENSEIGNANT", "FORMATEUR", "ANIMATEUR",
                    "CHEF_DEPARTEMENT", "RESPONSABLE_DOSSIER"})
    private String role;

    private String departementId;
    private String departement;
    private String upId;
    private String up;

    private String grade;
    private String specialite;
    private String telephone;
    private String photoUrl;

    @Schema(description = "Type d'enseignant : P=Permanent, V=Vacataire", example = "P")
    private String type;

    @Schema(description = "Statut métier de l'enseignant (etat)", example = "A")
    private String statut;

    @Schema(description = "Flag CUP (O/N)", example = "N")
    private String cup;

    @Schema(description = "Flag chef de département (O/N)", example = "N")
    private String chefDepartement;

    @Schema(description = "Compte actif (provenant de auth)", example = "true")
    private Boolean isActive;

    @Schema(description = "Le compte auth a-t-il été résolu ?", example = "true")
    private boolean accountLinked;

    private LocalDate dateRecrutement;

    // ── Suivi de dossier (RESPONSABLE_DOSSIER) ──
    private String dossierStatus;
    private LocalDateTime dossierLastUpdate;
    private String dossierNotes;

    private LocalDateTime createdAt;
}
