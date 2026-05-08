package esprit.pfe.servicecertificat.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class CertificateResponse {
    private Long id;
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
}
