package esprit.pfe.serviceformation.dto;

import esprit.pfe.serviceformation.entities.EtatFormation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FormationFilter {
    private String competence;
    private String domaine;
    private Long upId;
    private Long deptId;
    private Boolean ouverte;
    private LocalDate start;
    private LocalDate end;
    private List<EtatFormation> etats;
}
