package esprit.pfe.serviceformation.dto;

import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

/**
 * DTO de réponse pour Bureau (DSI #7 : ne pas exposer l'entité JPA — masque les
 * champs d'audit et les relations lazy).
 */
@Getter
@Setter
public class BureauDTO implements Serializable {
    private Long id;
    private String nom;
    private String email;
    private String numeroTelephone;
}
