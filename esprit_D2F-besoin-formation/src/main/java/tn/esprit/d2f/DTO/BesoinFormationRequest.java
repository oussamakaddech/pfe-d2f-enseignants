package tn.esprit.d2f.DTO;

import jakarta.validation.constraints.*;
import lombok.*;
import tn.esprit.d2f.entity.enumerations.PeriodCode;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BesoinFormationRequest {

    @NotBlank(message = "Le nom d'utilisateur est obligatoire")
    private String username;

    @NotNull(message = "Le type de besoin est obligatoire")
    private TypeBesoin typeBesoin;

    @NotBlank(message = "Le titre est obligatoire")
    @Size(min = 5, max = 150, message = "Le titre doit contenir entre 5 et 150 caractères")
    private String titre;

    @NotBlank(message = "L'objectif de la formation est obligatoire")
    private String objectifFormation;

    @Min(value = 1, message = "Le nombre maximum de participants doit être au moins 1")
    private int nbMaxParticipants;

    @Min(value = 1, message = "La durée de la formation doit être au moins 1 heure")
    private int dureeFormation;

    @NotBlank(message = "L'unité pédagogique (UP) est obligatoire")
    private String up;

    @NotBlank(message = "Le département est obligatoire")
    private String departement;

    @NotNull(message = "La priorité est obligatoire")
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
    private PeriodCode periodCode;
    private String customPeriodLabel;
    
    private String commentaire;

    private Long idBesoinFormation;
    private Boolean approuveCUP;
    private Boolean approuveChefDep;
    private Boolean approuveAdmin;
}
