package esprit.pfe.servicecertificat.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Data
public class CertificateVerificationResponse {
    private String certificateNumber;
    private String nomEnseignant;
    private String prenomEnseignant;
    private String titreFormation;
    private Integer chargeHoraireGlobal;
    private LocalDate dateDebutFormation;
    private LocalDate dateFinFormation;
    private OffsetDateTime issuedAt;
    private String certificateStatus;
    /** Compétences validées par la formation (affichées sur la page publique). */
    private String competencesValidees;
}