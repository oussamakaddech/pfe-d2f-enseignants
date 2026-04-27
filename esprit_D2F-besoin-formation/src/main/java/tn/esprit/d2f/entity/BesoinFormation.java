package tn.esprit.d2f.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import tn.esprit.d2f.entity.enumerations.Priorite;
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

    @JsonProperty("titre")
    String titre  ;

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

    @JsonProperty("horaireSouhaite")
    String horaireSouhaite  ;

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

    // ── Nouveaux champs : priorité et impact stratégique (§2.2.2) ──

    @Enumerated(EnumType.STRING)
    @Column(nullable = true)
    @JsonProperty("priorite")
    Priorite priorite ;

    @Column(nullable = true)
    @JsonProperty("impactStrategique")
    String impactStrategique ;

    // ── Accesseurs explicites pour les champs Boolean (is* pattern) ──
    // Nécessaire car Lombok génère getApprouveCUP() mais le code existant
    // appelle isApprouveCUP(), isApprouveChefDep(), isApprouveAdmin().

    public Boolean isApprouveCUP() {
        return approuveCUP;
    }

    public Boolean isApprouveChefDep() {
        return approuveChefDep;
    }

    public Boolean isApprouveAdmin() {
        return approuveAdmin;
    }

    public Boolean getApprouveCUP() {
        return approuveCUP;
    }

    public Boolean getApprouveChefDep() {
        return approuveChefDep;
    }

    public Boolean getApprouveAdmin() {
        return approuveAdmin;
    }

    public Boolean getEventPublished() {
        return eventPublished;
    }
}
