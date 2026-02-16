package esprit.pfe.serviceformation.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ParticipantFormationDTO {
    private String titreFormation;
    private List<FormateurNameDTO> formateurs;
    private Date dateDebut;
    private Date dateFin;
}
