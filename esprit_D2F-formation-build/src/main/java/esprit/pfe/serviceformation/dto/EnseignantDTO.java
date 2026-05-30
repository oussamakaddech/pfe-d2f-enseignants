package esprit.pfe.serviceformation.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EnseignantDTO {
    private String id;
    private String nom;
    private String prenom;
    private String mail;
    private String type;
    private String etat;
    // ← nouveaux champs
    private String   deptId;
    private String deptLibelle;
    private String   upId;
    private String upLibelle;
    private String cup;
    private String chefDepartement;

}

