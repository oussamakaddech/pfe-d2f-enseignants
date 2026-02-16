package esprit.pfe.serviceformation.DTO;



import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class EnseignantStatsDTO {
    private String enseignantId;
    private String nom;
    private String prenom;
    private long totalPresences;
}

