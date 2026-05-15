package esprit.pfe.servicecertificat.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;

@Data
public class CertificateRequest {

    @NotNull(message = "L'ID de la formation est obligatoire")
    @Positive(message = "L'ID de la formation doit etre positif")
    private Long formationId;

    @NotBlank(message = "Le titre de la formation est obligatoire")
    @Size(max = 255, message = "Le titre ne peut depasser 255 caracteres")
    private String titreFormation;

    @NotBlank(message = "Le type de certificat est obligatoire")
    @Pattern(regexp = "CERTIF|BADGE|ATTESTATION",
             message = "Type invalide. Valeurs autorisees : CERTIF, BADGE, ATTESTATION")
    private String typeCertif;

    @NotNull(message = "La date de début est obligatoire")
    @PastOrPresent(message = "La date de debut ne peut etre dans le futur lointain")
    private LocalDate dateDebutFormation;

    @NotNull(message = "La date de fin est obligatoire")
    private LocalDate dateFinFormation;

    @NotNull(message = "La charge horaire est obligatoire")
    @Min(value = 1, message = "La charge horaire doit etre d'au moins 1 heure")
    @Max(value = 10000, message = "La charge horaire ne peut depasser 10000 heures")
    private Integer chargeHoraireGlobal;

    @NotBlank(message = "L'ID de l'enseignant est obligatoire")
    @Size(max = 100, message = "L'ID enseignant ne peut depasser 100 caracteres")
    private String enseignantId;

    @NotBlank(message = "Le nom de l'enseignant est obligatoire")
    @Size(max = 100, message = "Le nom ne peut depasser 100 caracteres")
    private String nomEnseignant;

    @NotBlank(message = "Le prénom de l'enseignant est obligatoire")
    @Size(max = 100, message = "Le prenom ne peut depasser 100 caracteres")
    private String prenomEnseignant;

    @Email(message = "Format d'email invalide")
    @NotBlank(message = "L'email de l'enseignant est obligatoire")
    @Size(max = 255, message = "L'email ne peut depasser 255 caracteres")
    private String mailEnseignant;

    @Size(max = 100, message = "Le departement ne peut depasser 100 caracteres")
    private String deptEnseignant;

    @NotBlank(message = "Le rôle en formation est obligatoire")
    @Pattern(regexp = "ANIMATEUR|PARTICIPANT|FORMATEUR|OBSERVATEUR",
             message = "Role invalide. Valeurs autorisees : ANIMATEUR, PARTICIPANT, FORMATEUR, OBSERVATEUR")
    private String roleEnFormation;

    @AssertTrue(message = "La date de fin doit etre posterieure ou egale a la date de debut")
    public boolean isDateRangeValid() {
        if (dateDebutFormation == null || dateFinFormation == null) {
            return true;
        }
        return !dateFinFormation.isBefore(dateDebutFormation);
    }
}
