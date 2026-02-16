package esprit.pfe.serviceformation.messaging;


import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class BesoinFormationApprovedEvent {
    private Long idBesoinFormation;
    private String username;
    private String typeBesoin;
    private String objectifFormation;
    private String propositionAnimateur;
    private String prerequis;
    private String publicCible;
    private Integer nbMaxParticipants;
    private String programmeFormation;
    private Integer dureeFormation;
    private String theme;
    private String objectifsOperationnels;
    private String objectifsPedagogiques;
    private String methodesPedagogiques;
    private String moyensPedagogiques;
    private String methodesEvaluationAcquis;
    private String profilFormateur;
    private String up;
    private String departement;
    private Boolean approuveCUP;
    private Boolean approuveChefDep;
    private Boolean approuveAdmin;
    private String notificationMessage;
}

