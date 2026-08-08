package esprit.pfe.serviceformation.dto;

import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

/**
 * DTO de réponse pour AnimateurExterne (ne pas exposer l'entité JPA — masque
 * les champs d'audit et la relation lazy vers le bureau).
 */
@Getter
@Setter
public class AnimateurExterneDTO implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String nom;
    private String prenom;
    private String email;
    private Long bureauId;
}
