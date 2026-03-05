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
public class DomaineDTO {
    private Long id;
    private String code;
    private String nom;
    private String description;
    private Boolean actif;
    private List<CompetenceDTO> competences;
}
