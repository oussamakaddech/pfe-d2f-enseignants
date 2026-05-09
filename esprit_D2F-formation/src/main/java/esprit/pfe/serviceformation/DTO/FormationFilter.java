package esprit.pfe.serviceformation.dto;

import esprit.pfe.serviceformation.entities.EtatFormation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
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
    private Date start;
    private Date end;
    private List<EtatFormation> etats;
}
