package esprit.pfe.servicecertificat.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Data
public class CertificateResponse {
    private Long id;
    private String certificateNumber;
    private String verificationToken;
    private String verificationHash;
    private OffsetDateTime issuedAt;
    private String certificateStatus;
    private Long formationId;
    private String titreFormation;
    private String typeCertif;
    private LocalDate dateDebutFormation;
    private LocalDate dateFinFormation;
    private Integer chargeHoraireGlobal;
    private String enseignantId;
    private String nomEnseignant;
    private String prenomEnseignant;
    private String mailEnseignant;
    private String deptEnseignant;
    private String roleEnFormation;
    private boolean delivered;
    /** Date d'émission du certificat — utilisée par le Skill Passport. Mappée sur dateFinFormation. */
    private LocalDate createdAt;
    private String pdfFilePath;
    private OffsetDateTime revokedAt;
    private String revokedBy;
    private String revocationReason;
}
