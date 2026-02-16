package tn.esprit.d2f.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class NiveauDTO {
    @JsonProperty("idNiveau")
    long idNiveau ;

    @JsonProperty("descriptionNiveau")
    String descriptionNiveau ;
}
