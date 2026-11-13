package esprit.pfe.serviceformation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Nombre de formateurs distincts intervenus sur une période : animateurs
 * internes (niveau formation ou séance, dédoublonnés) et animateurs externes.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FormateursKpiDTO {
    private long total;
    private long internes;
    private long externes;
}
