package tn.esprit.d2f.DTO;

import lombok.*;
import tn.esprit.d2f.entity.enumerations.PeriodCode;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BesoinFormationResponse {
    private long idBesoinFormation;
    private String username;
    private TypeBesoin typeBesoin;
    private String objectifFormation;
    private String propositionAnimateur;
    private String prerequis;
    private String publicCible;
    private int nbMaxParticipants;
    private String programmeFormation;
    private int dureeFormation;
    private String titre;
    private String theme;
    private String objectifsOperationnels;
    private String objectifsPedagogiques;
    private String methodesPedagogiques;
    private String moyensPedagogiques;
    private String methodesEvaluationAcquis;
    private String profilFormateur;
    private String horaireSouhaite;
    private String up;
    private String departement;
    private Boolean approuveCUP;
    private Boolean approuveChefDep;
    private Boolean approuveAdmin;
    private String notificationMessage;
    private Priorite priorite;
    private String impactStrategique;
    private Boolean estOuverte;
    private String autresInformations;
    private PeriodCode periodCode;
    private String customPeriodLabel;
    private Boolean eventPublished;
}
