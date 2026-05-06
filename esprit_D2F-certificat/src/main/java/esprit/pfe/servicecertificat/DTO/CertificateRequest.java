package esprit.pfe.servicecertificat.DTO;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;

@Data
public class CertificateRequest {
    @NotNull(message = "L'ID de la formation est obligatoire")
    private Long formationId;

    @NotBlank(message = "Le titre de la formation est obligatoire")
    private String titreFormation;

    @NotBlank(message = "Le type de certificat est obligatoire")
    private String typeCertif;

    @NotNull(message = "La date de début est obligatoire")
    private LocalDate dateDebutFormation;

    @NotNull(message = "La date de fin est obligatoire")
    private LocalDate dateFinFormation;

    @Min(value = 1, message = "La charge horaire doit être d'au moins 1 heure")
    private Integer chargeHoraireGlobal;

    @NotBlank(message = "L'ID de l'enseignant est obligatoire")
    private String enseignantId;

    @NotBlank(message = "Le nom de l'enseignant est obligatoire")
    private String nomEnseignant;

    @NotBlank(message = "Le prénom de l'enseignant est obligatoire")
    private String prenomEnseignant;

    @Email(message = "Format d'email invalide")
    @NotBlank(message = "L'email de l'enseignant est obligatoire")
    private String mailEnseignant;

    private String deptEnseignant;
    
    @NotBlank(message = "Le rôle en formation est obligatoire")
    private String roleEnFormation;
}
