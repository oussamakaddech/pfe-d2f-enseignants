package esprit.pfe.serviceformation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ParticipantFormationDTO {
    private String titreFormation;
    private List<FormateurNameDTO> formateurs;
    private LocalDate dateDebut;
    private LocalDate dateFin;
}
