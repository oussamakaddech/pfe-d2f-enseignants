package tn.esprit.d2f.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class DomaineDTO {
    @JsonProperty("idDomaine")
    private Long idDomaine;

    @JsonProperty("nomDomaine")
    private String nomDomaine;

    @JsonProperty("descriptionDomaine")
    private String descriptionDomaine;
}
