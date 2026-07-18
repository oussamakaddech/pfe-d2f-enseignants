package esprit.pfe.serviceformation.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "enseignants")
// Soft delete : les enseignants supprimés (deleted_at non null) sont exclus de
// toutes les requêtes JPA. On évite ainsi la violation de contraintes FK
// (séances/présences/inscriptions) tout en préservant l'historique.
@SQLDelete(sql = "UPDATE enseignants SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class Enseignant extends BaseAuditEntity {

    @Id
    @Column(length = 10, nullable = false, unique = true)
    private String id; // ex: E12345

    @Column(length = 100, nullable = false)
    private String nom;

    @Column(length = 30, nullable = false)
    private String prenom;

    @Column(nullable = false)
    private String mail;

    @Column(length = 1, nullable = false)
    private String type;

    @Column(length = 1, nullable = false)
    private String etat;

    @Column(length = 1, nullable = false)
    private String cup;

    @Column(name = "chef_departement", length = 1, nullable = false)
    private String chefDepartement;

    // Grade académique (Assistant, Maître Assistant, Maître de Conférences, Professeur…)
    @Column(length = 100)
    private String grade;

    @Column(length = 30)
    private String telephone;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    // ── Profil métier additionnel (page de gestion unifiée) ──────────────
    @Column(length = 150)
    private String specialite;

    // Date de recrutement / embauche — filtre par plage + tri.
    @Column(name = "date_recrutement")
    private LocalDate dateRecrutement;

    // ── Suivi de dossier (scope RESPONSABLE_DOSSIER) ─────────────────────
    // Valeurs conventionnelles (non figées en base) : EN_ATTENTE, EN_COURS,
    // COMPLET, INCOMPLET, ARCHIVE. La validation applicative est dans le service.
    @Column(name = "dossier_status", length = 30)
    private String dossierStatus;

    @Column(name = "dossier_last_update")
    private LocalDateTime dossierLastUpdate;

    @Column(name = "dossier_notes", columnDefinition = "TEXT")
    private String dossierNotes;

    // Lien explicite vers le compte (auth.users) — architecture microservices :
    // pas de FK SQL inter-bases, mais identifiant du compte + unicité applicative
    // (« un compte = une fiche enseignant »). Voir migration V29.
    @Column(name = "user_id", length = 36, unique = true)
    private String userId;

    // Relation avec UP et Dept si besoin
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "up_id", referencedColumnName = "id", nullable = true)
    private Up up;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "dept_id", referencedColumnName = "id", nullable = true)
    private Dept dept;

    // Présences (historique)
    @JsonIgnore
    @OneToMany(mappedBy = "enseignant", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Presence> presences;

    @JsonIgnore
    @OneToMany(mappedBy = "enseignant", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Inscription> inscriptions = new ArrayList<>();

    // Suppression logique (soft delete) — null = actif.
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

}
