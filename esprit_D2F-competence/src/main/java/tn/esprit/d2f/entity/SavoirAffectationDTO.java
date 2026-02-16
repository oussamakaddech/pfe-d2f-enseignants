package tn.esprit.d2f.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SavoirAffectationDTO implements Serializable {
    private Long savoirId;
    private Long niveauId;
    private List<Long> competencesIds;

    public Long getSavoirId() {
        return savoirId;
    }

    public void setSavoirId(Long savoirId) {
        this.savoirId = savoirId;
    }

    public Long getNiveauId() {
        return niveauId;
    }

    public void setNiveauId(Long niveauId) {
        this.niveauId = niveauId;
    }

    public List<Long> getCompetencesIds() {
        return competencesIds;
    }

    public void setCompetencesIds(List<Long> competencesIds) {
        this.competencesIds = competencesIds;
    }
}
