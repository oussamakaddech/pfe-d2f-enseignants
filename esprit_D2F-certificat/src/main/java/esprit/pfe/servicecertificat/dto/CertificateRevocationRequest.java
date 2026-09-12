package esprit.pfe.servicecertificat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Demande de révocation d'un certificat (motif obligatoire). */
@Data
public class CertificateRevocationRequest {

    @NotBlank(message = "Le motif de révocation est obligatoire")
    @Size(max = 500, message = "Le motif ne peut pas dépasser 500 caractères")
    private String reason;
}
