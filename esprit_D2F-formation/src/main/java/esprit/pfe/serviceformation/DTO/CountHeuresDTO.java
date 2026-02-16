package esprit.pfe.serviceformation.DTO;




import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CountHeuresDTO {
    private Long count;        // nombre de formations
    private Long totalHeures;  // somme des charges horaires (en Long, pour coller au SUM)
    public CountHeuresDTO(Long count, int totalHeures) {
        this.count = count;
        this.totalHeures = Long.valueOf(totalHeures);
    }
}

