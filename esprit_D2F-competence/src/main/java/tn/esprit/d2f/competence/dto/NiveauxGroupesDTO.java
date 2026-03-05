package tn.esprit.d2f.competence.dto;

import lombok.*;

import java.util.List;
import java.util.Map;

/**
 * Regroupe les savoirs requis par niveau pour un parent (compétence ou sous-compétence).
 * Remplace le raw {@code Map<String, List<NiveauSavoirRequisDTO>>}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NiveauxGroupesDTO {

    /** ID du parent (compétence ou sous-compétence). */
    private Long parentId;

    /** Nom du parent. */
    private String parentNom;

    /**
     * Savoirs requis regroupés par niveau (clef = nom enum NiveauMaitrise).
     * Exemple : "N1_DEBUTANT" → [NiveauSavoirRequisDTO, ...]
     */
    private Map<String, List<NiveauSavoirRequisDTO>> niveaux;
}
