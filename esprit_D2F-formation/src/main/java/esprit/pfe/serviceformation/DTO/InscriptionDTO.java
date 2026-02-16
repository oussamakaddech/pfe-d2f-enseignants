package esprit.pfe.serviceformation.DTO;



import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InscriptionDTO {
    private Long id;
    private FormationDTO formation;
    private EnseignantDTO enseignant;
    private String etat;
    private OffsetDateTime dateDemande;
}
