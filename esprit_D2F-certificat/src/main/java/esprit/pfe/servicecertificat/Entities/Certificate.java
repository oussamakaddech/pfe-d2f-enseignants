package esprit.pfe.servicecertificat.Entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "certificates")
public class Certificate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idCertificate;

    // Informations sur la formation
    private Long formationId;
    private String titreFormation;
    private String typeCertif; // "CERTIF", "BADGE", "ATTESTATION", etc.
    @Temporal(TemporalType.DATE)
    private Date dateDebutFormation;
    @Temporal(TemporalType.DATE)
    private Date dateFinFormation;
    private Integer chargeHoraireGlobal;

    // Informations sur l’enseignant (ici animateur ou participant)
    private String enseignantId;
    private String nomEnseignant;
    private String prenomEnseignant;
    private String mailEnseignant;
    private String deptEnseignant; // Département de l’enseignant
    private String roleEnFormation; // ex. "ANIMATEUR"

    private boolean delivered;

    // Nouveau : chemin du fichier PDF généré
    private String pdfFilePath;
}
