package tn.esprit.d2f.competence.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiceImportRequest {

    @NotEmpty(message = "Au moins un domaine est requis")
    @Valid
    private List<RiceDomaineRequest> domaines;
}
