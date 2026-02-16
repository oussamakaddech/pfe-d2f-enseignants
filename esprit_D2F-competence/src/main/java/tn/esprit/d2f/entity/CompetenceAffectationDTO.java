package tn.esprit.d2f.entity;

import lombok.*;

import java.io.Serializable;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
@Builder
public class CompetenceAffectationDTO implements Serializable {
    private Long competenceId;
    private Long domaineId;
    private Long niveauId;
    private List<Long> savoirIds;

    public Long getCompetenceId() {
        return competenceId;
    }

    public void setCompetenceId(Long competenceId) {
        this.competenceId = competenceId;
    }

    public Long getDomaineId() {
        return domaineId;
    }

    public void setDomaineId(Long domaineId) {
        this.domaineId = domaineId;
    }

    public Long getNiveauId() {
        return niveauId;
    }

    public void setNiveauId(Long niveauId) {
        this.niveauId = niveauId;
    }

    public List<Long> getSavoirIds() {
        return savoirIds;
    }

    public void setSavoirIds(List<Long> savoirIds) {
        this.savoirIds = savoirIds;
    }
}

