package esprit.pfe.serviceevaluation.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor


public class EnseignantDTO {
    private String id;         // si c'est un string
    private String nom;
    private String prenom;
    private String mail;
    private String type;
    private String deptLibelle;
    private String upLibelle;
    // etc...
}
