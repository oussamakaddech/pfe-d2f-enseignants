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
    // Ids de référentiel (Up.id / Dept.id sont des String) — le périmètre
    // CUP/chef est forcé côté service (KpiScopeService).
    private String upId;
    private String deptId;
    private Boolean ouverte;
    private LocalDate start;
    private LocalDate end;
    private List<EtatFormation> etats;
}
