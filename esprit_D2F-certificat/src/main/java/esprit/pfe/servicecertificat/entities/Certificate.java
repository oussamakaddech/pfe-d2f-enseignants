package esprit.pfe.servicecertificat.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@SQLDelete(sql = "UPDATE certificat.certificates SET deleted_at = NOW() WHERE id_certificate = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
@Table(name = "certificates")
public class Certificate extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idCertificate;

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

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
