package tn.esprit.d2f.dto;

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

    private String username;

    private TypeBesoin typeBesoin;

    private String titre;

    private String objectifFormation;

    private Integer nbMaxParticipants;

    private Integer dureeFormation;

    private String up;

    private String departement;

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
