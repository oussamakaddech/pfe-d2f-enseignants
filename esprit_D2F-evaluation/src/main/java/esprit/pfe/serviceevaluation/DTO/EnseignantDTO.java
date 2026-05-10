package esprit.pfe.serviceevaluation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EnseignantDTO {
    private String id;         // si c'est un string
    private String nom;
    private String prenom;
    private String mail;
    private String type;
    private String deptLibelle;
    private String upLibelle;
}
