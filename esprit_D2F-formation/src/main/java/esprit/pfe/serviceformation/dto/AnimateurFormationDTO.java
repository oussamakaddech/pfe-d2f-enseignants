package esprit.pfe.serviceformation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AnimateurFormationDTO {
    private String titreFormation;
    private String populationCible;
    private String objectifs;
    private int chargeHoraireGlobal;
    private LocalDate dateDebut;
    private LocalDate dateFin;
}
