package esprit.pfe.servicecertificat.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLDelete(sql = "UPDATE certificat.certificates SET deleted_at = NOW() WHERE id_certificate = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
@Table(name = "certificates")
public class Certificate extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idCertificate;

    @Column(name = "certificate_number", nullable = false, unique = true, length = 40)
    private String certificateNumber;
    @Column(name = "verification_token", nullable = false, unique = true, length = 100)
    private String verificationToken;
    @Column(name = "verification_hash", nullable = false, length = 128)
    private String verificationHash;
    @Column(name = "issued_at", nullable = false)
    private OffsetDateTime issuedAt;
    @Column(name = "certificate_status", nullable = false, length = 20)
    private String certificateStatus = "ISSUED";

    // Informations sur la formation
    private Long formationId;
    private String titreFormation;
    private String typeCertif; // "CERTIF", "BADGE", "ATTESTATION", etc.
    private LocalDate dateDebutFormation;
    private LocalDate dateFinFormation;
    private Integer chargeHoraireGlobal;

    // Informations sur l'enseignant (ici animateur ou participant)
    private String enseignantId;
    private String nomEnseignant;
    private String prenomEnseignant;
    private String mailEnseignant;
    private String deptEnseignant; // Departement de l'enseignant
    private String roleEnFormation; // ex. "ANIMATEUR"

    private boolean delivered;

    // Nouveau : chemin du fichier PDF genere
    private String pdfFilePath;

    // ── Cycle de vie (étape 4) ──
    @Column(name = "revoked_at")
    private OffsetDateTime revokedAt;
    @Column(name = "revoked_by", length = 150)
    private String revokedBy;
    @Column(name = "revocation_reason", length = 500)
    private String revocationReason;

    /** Compétences validées par la formation (affichées sur la page de vérification). */
    @Column(name = "competences_validees", length = 1000)
    private String competencesValidees;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
