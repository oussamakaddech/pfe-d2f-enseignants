package esprit.pfe.serviceformation.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Payload de création / mise à jour d'un animateur externe (le bureau est porté
 * par le chemin de l'URL, pas par le corps).
 */
@Data
public class AnimateurExterneRequest {

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 100)
    private String nom;

    @NotBlank(message = "Le prénom est obligatoire")
    @Size(max = 100)
    private String prenom;

    @Email(message = "Format d'email invalide")
    @Size(max = 255)
    private String email;
}
