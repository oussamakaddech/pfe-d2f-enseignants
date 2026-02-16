package esprit.pfe.serviceevaluation.DTO;

import lombok.Getter;
import lombok.Setter;

import java.util.Date;
@Getter
@Setter
public class FormationDTO {
    private Long idFormation;
    private String titreFormation;
    private String typeFormation;
    private Date dateDebut;
    private Date dateFin;
    private String etatFormation;
    private Double coutFormation;
    private String organismeRefExterne;
    private Integer chargeHoraireGlobal;
}
