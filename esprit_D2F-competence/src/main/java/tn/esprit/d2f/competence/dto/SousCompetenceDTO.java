package tn.esprit.d2f.competence.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.List;

@Getter
@Setter
@EqualsAndHashCode(of = "id")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SousCompetenceDTO {
    private Long id;
    private String code;
    private String nom;
    private String description;
    private Long competenceId;
    private String competenceNom;
    private List<SavoirDTO> savoirs;
}
