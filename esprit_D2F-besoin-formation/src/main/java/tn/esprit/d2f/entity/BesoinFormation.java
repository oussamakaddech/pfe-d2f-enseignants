package tn.esprit.d2f.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import tn.esprit.d2f.entity.enumerations.ApprovalStep;
import tn.esprit.d2f.entity.enumerations.BesoinStatus;
import tn.esprit.d2f.entity.enumerations.CreatorRole;
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
@SQLDelete(sql = "UPDATE besoin_formation SET deleted_at = CURRENT_TIMESTAMP WHERE id_besoin_formation = ?")
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

    // ── Workflow sécurisé : créateur, étape courante, statut, traçabilité ──
    // Règles métier appliquées côté serveur (jamais depuis le frontend) :
    // INDIVIDUEL (enseignant) : CUP → CHEF_DEPARTEMENT → ADMIN
    // COLLECTIF (CUP) : CHEF_DEPARTEMENT → ADMIN (le créateur ne valide jamais)
    // COLLECTIF (chef) : ADMIN (le créateur ne valide jamais)

    /** Identifiant technique du créateur (claim JWT "userId", repli = username). */
    @Column(name = "created_by_user_id")
    @JsonProperty("createdByUserId")
    String createdByUserId;

    /** Rôle fonctionnel du créateur, figé côté serveur à la création. */
    @Enumerated(EnumType.STRING)
    @Column(name = "created_by_role", length = 20)
    @JsonProperty("createdByRole")
    CreatorRole createdByRole;

    /** Étape courante du workflow (qui doit traiter le besoin). */
    @Enumerated(EnumType.STRING)
    @Column(name = "current_approval_step", length = 20)
    @JsonProperty("currentApprovalStep")
    ApprovalStep currentApprovalStep;

    /** Statut métier détaillé (progression + états terminaux). */
    @Enumerated(EnumType.STRING)
    @Column(length = 25)
    @JsonProperty("status")
    BesoinStatus status;

    /** Motif du refus (obligatoire en cas de REJECTED). */
    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    @JsonProperty("rejectionReason")
    String rejectionReason;

    @Column(name = "rejected_by", length = 150)
    @JsonProperty("rejectedBy")
    String rejectedBy;

    @Column(name = "rejected_at")
    @JsonProperty("rejectedAt")
    Instant rejectedAt;

    /** Username du validateur à chaque étape (piste d'audit requise §3). */
    @Column(name = "approved_by_cup", length = 150)
    @JsonProperty("approvedByCup")
    String approvedByCup;

    @Column(name = "approved_by_chef_dep", length = 150)
    @JsonProperty("approvedByChefDepartement")
    String approvedByChefDepartement;

    @Column(name = "approved_by_admin", length = 150)
    @JsonProperty("approvedByAdmin")
    String approvedByAdmin;

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

    // ── Acteurs proposés : animateurs & enseignants participants ──
    // Stockés en texte (une ligne "Nom Prénom <email>" par acteur), cohérent
    // avec publicCible. Renseignés via les sélecteurs liés à la base enseignants.

    @Column(columnDefinition = "TEXT", nullable = true)
    @JsonProperty("animateurs")
    String animateurs ;

    @Column(columnDefinition = "TEXT", nullable = true)
    @JsonProperty("enseignants")
    String enseignants ;

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
