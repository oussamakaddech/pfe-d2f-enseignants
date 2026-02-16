package tn.esprit.d2f.entity;


import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@ToString
public class Competence implements Serializable {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Setter(AccessLevel.NONE)
    @JsonProperty("idCompetence")
    private Long idCompetence;

    @JsonProperty("nomCompetence")
    private String nomCompetence;

    @JsonProperty("descriptionCompetence")
    private String descriptionCompetence;

    @JsonProperty("domaineId")
    private Long domaineId;

    @JsonProperty("niveauId")
    private Long niveauId;

    @JsonProperty("savoirsIds")
    @ElementCollection
    private List<Long> savoirIds;


    public void setDomaineId(Long domaineId) {
        this.domaineId = domaineId;
    }

    public Long getDomaineId() {
        return domaineId;
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

    public Long getIdCompetence() {
        return idCompetence;
    }

    public String getNomCompetence() {
        return nomCompetence;
    }

    public String getDescriptionCompetence() {
        return descriptionCompetence;
    }
}

