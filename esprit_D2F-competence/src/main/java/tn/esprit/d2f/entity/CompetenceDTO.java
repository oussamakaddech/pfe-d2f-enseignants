package tn.esprit.d2f.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CompetenceDTO {
    @JsonProperty("idCompetence")
    private Long idCompetence;

    @JsonProperty("nomCompetence")
    private String nomCompetence;

    @JsonProperty("descriptionCompetence")
    private String descriptionCompetence;

    @JsonProperty("domaine")
    private DomaineDTO domaine;

    @JsonProperty("niveau")
    private NiveauDTO niveau;



    public CompetenceDTO(Long idCompetence, String nomCompetence, String descriptionCompetence, DomaineDTO domaine, NiveauDTO niveau ) {
        this.idCompetence = idCompetence;
        this.nomCompetence = nomCompetence;
        this.descriptionCompetence = descriptionCompetence;
        this.domaine = domaine;
        this.niveau = niveau ;
    }


}

