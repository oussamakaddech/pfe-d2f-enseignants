package tn.esprit.d2f.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import tn.esprit.d2f.entity.enumeration.TypeSavoir;
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class SavoirDTO {
    @JsonProperty("idSavoir")
    long idSavoir ;

    @JsonProperty("descriptionSavoir")
    String descriptionSavoir ;

    @JsonProperty("typeSavoir")
    TypeSavoir typeSavoir ;
}
