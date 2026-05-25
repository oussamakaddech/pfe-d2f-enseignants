package tn.esprit.d2f.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.SQLRestriction;
import tn.esprit.d2f.entity.enumerations.PeriodCode;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;

import java.io.Serializable;
import java.time.Instant;

/**
 * Entité principale du service besoin-formation.
 *
 * <p>Fix 5 — Soft Delete : les enregistrements supprimés ont {@code deleted_at} non null.
 * {@code @SQLRestriction} filtre automatiquement ces enregistrements dans toutes les requêtes JPA.</p>
 *
 * <p>Fix 6 — Audit : champs {@code createdAt}, {@code updatedAt}, {@code createdBy}, {@code updatedBy}
 * hérités de {@link BaseAuditEntity} (déjà implémentés).</p>
 */
@Entity
@SQLRestriction("deleted_at IS NULL")   // Fix 5: Soft Delete — filtre global automatique
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@ToString
public class BesoinFormation extends BaseAuditEntity implements Serializable {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonProperty("idBesoinFormation")
    Long idBesoinFormation ;

    @JsonProperty("username")
    String username ;

    @Enumerated(EnumType.STRING)
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
    Integer nbMaxParticipants  ;

    @JsonProperty("programmeFormation")
    String programmeFormation  ;

    @JsonProperty("dureeFormation")
    Integer dureeFormation   ;

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

    @Column(name = "approuve_cup", nullable = true)
    @JsonProperty("approuveCUP")
    Boolean approuveCUP  ;
    
    @Column(name = "approuve_chef_dep", nullable = true)
    @JsonProperty("approuveChefDep")
    Boolean approuveChefDep  ;
    
    @Column(name = "approuve_admin", nullable = true)
    @JsonProperty("approuveAdmin")
    Boolean approuveAdmin  ;

    @JsonProperty("notificationMessage")
    String notificationMessage  ;

    @Column(name = "event_published", nullable = false)
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

    // ── Nouveaux champs : type ouvert/fermé et autres informations (§2.2.3) ──

    @Column(nullable = true)
    @JsonProperty("estOuverte")
    Boolean estOuverte = false;

    @Column(columnDefinition = "TEXT", nullable = true)
    @JsonProperty("autresInformations")
    String autresInformations ;

    @Enumerated(EnumType.STRING)
    @Column(nullable = true)
    @JsonProperty("periodCode")
    PeriodCode periodCode ;

    @Column(nullable = true)
    @JsonProperty("customPeriodLabel")
    String customPeriodLabel ;

    @Column(nullable = true)
    @JsonProperty("dateDebut")
    String dateDebut ;

    @Column(name = "date_fin", nullable = true)
    @JsonProperty("dateFin")
    String dateFin ;

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

    public void setIdBesoinFormation(Long idBesoinFormation) {
        this.idBesoinFormation = idBesoinFormation;
    }

    @Column(name = "last_refresh_date")
    private java.time.LocalDateTime lastRefreshDate;

    // ── Fix 5 — Soft Delete ────────────────────────────────────────────────
    /**
     * Timestamp UTC de la suppression logique. NULL = enregistrement actif.
     * {@link org.hibernate.annotations.SQLRestriction} filtre automatiquement les lignes non-nulles.
     */
    @Column(name = "deleted_at")
    private Instant deletedAt;
}
