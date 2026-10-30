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

    private String departement;

    /**
     * Domaine de l'application auquel rattacher l'import (facultatif).
     * Fourni : aucun domaine n'est créé — chaque domaine RICE devient une
     * compétence de ce domaine (son nom devient le nom de la compétence) et
     * ses compétences deviennent des sous-compétences.
     * Absent : comportement historique (un domaine est créé par domaine RICE).
     */
    private String domaineCibleId;
}
