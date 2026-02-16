package tn.esprit.d2f.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;

import java.io.Serializable;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@ToString
public class BesoinFormation implements Serializable {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Setter(AccessLevel.NONE)
    @JsonProperty("idBesoinFormation")
    long idBesionFormation ;

    @JsonProperty("username")
    String username ;

    @JsonProperty("typeBesoin")
    TypeBesoin typeBesoin ;

    @JsonProperty("objectifFormation")
    String objectifFormation ;

    @JsonProperty("propositionAnimateur")
    String propositionAnimateur ;

    @JsonProperty("prerequis")
    String prerequis  ;

    @JsonProperty("publicCible")
    String publicCible  ;

    @JsonProperty("nbMaxParticipants")
    int nbMaxParticipants  ;

    @JsonProperty("programmeFormation")
    String programmeFormation  ;

    @JsonProperty("dureeFormation")
    int dureeFormation   ;

    @JsonProperty("theme")
    String theme  ;

    @JsonProperty("objectifsOperationnels")
    String objectifsOperationnels  ;

    @JsonProperty("objectifsPedagogiques")
    String objectifsPedagogiques  ;

    @JsonProperty("methodesPedagogiques")
    String methodesPedagogiques  ;

    @JsonProperty("moyensPedagogiques")
    String moyensPedagogiques  ;

    @JsonProperty("methodesEvaluationAcquis")
    String methodesEvaluationAcquis  ;

    @JsonProperty("profilFormateur")
    String profilFormateur  ;

    @JsonProperty("up")
    String up  ;

    @JsonProperty("departement")
    String departement  ;

    @Column(nullable = true)
    @JsonProperty("approuveCUP")
    Boolean approuveCUP  ;

    @Column(nullable = true)
    @JsonProperty("approuveChefDep")
    Boolean approuveChefDep  ;

    @Column(nullable = true)
    @JsonProperty("approuveAdmin")
    Boolean approuveAdmin  ;

    @JsonProperty("notificationMessage")
    String notificationMessage  ;

    @Column(nullable = false)
    @JsonProperty("eventPublished")
    Boolean eventPublished = false;
    public long getIdBesionFormation() {
        return idBesionFormation;
    }

    public void setIdBesionFormation(long idBesionFormation) {
        this.idBesionFormation = idBesionFormation;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public TypeBesoin getTypeBesoin() {
        return typeBesoin;
    }

    public void setTypeBesoin(TypeBesoin typeBesoin) {
        this.typeBesoin = typeBesoin;
    }

    public String getObjectifFormation() {
        return objectifFormation;
    }

    public void setObjectifFormation(String objectifFormation) {
        this.objectifFormation = objectifFormation;
    }

    public String getPropositionAnimateur() {
        return propositionAnimateur;
    }

    public void setPropositionAnimateur(String propositionAnimateur) {
        this.propositionAnimateur = propositionAnimateur;
    }

    public String getPrerequis() {
        return prerequis;
    }

    public void setPrerequis(String prerequis) {
        this.prerequis = prerequis;
    }

    public String getPublicCible() {
        return publicCible;
    }

    public void setPublicCible(String publicCible) {
        this.publicCible = publicCible;
    }

    public int getNbMaxParticipants() {
        return nbMaxParticipants;
    }

    public void setNbMaxParticipants(int nbMaxParticipants) {
        this.nbMaxParticipants = nbMaxParticipants;
    }

    public String getProgrammeFormation() {
        return programmeFormation;
    }

    public void setProgrammeFormation(String programmeFormation) {
        this.programmeFormation = programmeFormation;
    }

    public int getDureeFormation() {
        return dureeFormation;
    }

    public void setDureeFormation(int dureeFormation) {
        this.dureeFormation = dureeFormation;
    }

    public String getTheme() {
        return theme;
    }

    public void setTheme(String theme) {
        this.theme = theme;
    }

    public String getObjectifsOperationnels() {
        return objectifsOperationnels;
    }

    public void setObjectifsOperationnels(String objectifsOperationnels) {
        this.objectifsOperationnels = objectifsOperationnels;
    }

    public String getObjectifsPedagogiques() {
        return objectifsPedagogiques;
    }

    public void setObjectifsPedagogiques(String objectifsPedagogiques) {
        this.objectifsPedagogiques = objectifsPedagogiques;
    }

    public String getMethodesPedagogiques() {
        return methodesPedagogiques;
    }

    public void setMethodesPedagogiques(String methodesPedagogiques) {
        this.methodesPedagogiques = methodesPedagogiques;
    }

    public String getMoyensPedagogiques() {
        return moyensPedagogiques;
    }

    public void setMoyensPedagogiques(String moyensPedagogiques) {
        this.moyensPedagogiques = moyensPedagogiques;
    }

    public String getMethodesEvaluationAcquis() {
        return methodesEvaluationAcquis;
    }

    public void setMethodesEvaluationAcquis(String methodesEvaluationAcquis) {
        this.methodesEvaluationAcquis = methodesEvaluationAcquis;
    }

    public String getProfilFormateur() {
        return profilFormateur;
    }

    public void setProfilFormateur(String profilFormateur) {
        this.profilFormateur = profilFormateur;
    }

    public String getUp() {
        return up;
    }

    public void setUp(String up) {
        this.up = up;
    }

    public String getDepartement() {
        return departement;
    }

    public void setDepartement(String departement) {
        this.departement = departement;
    }

    public Boolean isApprouveCUP() {
        return approuveCUP;
    }

    public void setApprouveCUP(Boolean approuveCUP) {
        this.approuveCUP = approuveCUP;
    }

    public Boolean isApprouveChefDep() {
        return approuveChefDep;
    }

    public void setApprouveChefDep(Boolean approuveChefDep) {
        this.approuveChefDep = approuveChefDep;
    }

    public Boolean isApprouveAdmin() {
        return approuveAdmin;
    }

    public void setApprouveAdmin(Boolean approuveAdmin) {
        this.approuveAdmin = approuveAdmin;
    }

    public String getNotificationMessage() {
        return notificationMessage;
    }

    public void setNotificationMessage(String notificationMessage) {
        this.notificationMessage = notificationMessage;
    }
}
