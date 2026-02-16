package esprit.pfe.serviceformation.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Date;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AnimateurFormationDTO {
    private String titreFormation;
    private String populationCible;
    private String objectifs;
    private int chargeHoraireGlobal;
    private Date dateDebut;
    private Date dateFin;
}
