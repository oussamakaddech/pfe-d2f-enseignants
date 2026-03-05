package tn.esprit.d2f.competence.service;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValuePropertyMappingStrategy;
import tn.esprit.d2f.competence.dto.*;
import tn.esprit.d2f.competence.entity.*;

/**
 * MapStruct mapper – Entity <-> DTO.
 * Spring bean injected via @RequiredArgsConstructor in every service.
 */
@Mapper(componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface CompetenceMapper {

    // ─── Domaine ─────────────────────────────────────────────────────────────

    /** Full mapping including the competences list. */
    DomaineDTO toDTO(Domaine d);

    /** Light mapping WITHOUT the competences list (avoids N+1 in toggle/list). */
    @Mapping(target = "competences", ignore = true)
    DomaineDTO toDTOLight(Domaine d);

    // ─── Competence ──────────────────────────────────────────────────────────

    @Mapping(target = "domaineId",    source = "domaine.id")
    @Mapping(target = "domaineNom",   source = "domaine.nom")
    @Mapping(target = "nbEnseignants", ignore = true)
    CompetenceDTO toDTO(Competence c);

    // ─── SousCompetence ──────────────────────────────────────────────────────

    @Mapping(target = "competenceId",  source = "competence.id")
    @Mapping(target = "competenceNom", source = "competence.nom")
    SousCompetenceDTO toDTO(SousCompetence sc);

    // ─── Savoir ──────────────────────────────────────────────────────────────

    @Mapping(target = "sousCompetenceId",  source = "sousCompetence.id")
    @Mapping(target = "sousCompetenceNom", source = "sousCompetence.nom")
    @Mapping(target = "competenceId",      source = "competence.id")
    @Mapping(target = "competenceNom",     source = "competence.nom")
    SavoirDTO toDTO(Savoir s);

    // ─── EnseignantCompetence ────────────────────────────────────────────────

    /**
     * Complex mapping: Savoir can be attached via SousCompetence OR directly
     * to a Competence.  We keep this as a default method to handle both paths
     * with null-safe navigation.
     */
    default EnseignantCompetenceDTO toDTO(EnseignantCompetence ec) {
        if (ec == null) return null;
        Savoir s = ec.getSavoir();
        SousCompetence sc = s != null ? s.getSousCompetence() : null;
        Competence c = sc != null ? sc.getCompetence() : (s != null ? s.getCompetence() : null);
        Domaine d = c != null ? c.getDomaine() : null;
        return EnseignantCompetenceDTO.builder()
                .id(ec.getId())
                .enseignantId(ec.getEnseignantId())
                .savoirId(s != null ? s.getId() : null)
                .savoirNom(s != null ? s.getNom() : null)
                .savoirCode(s != null ? s.getCode() : null)
                .sousCompetenceNom(sc != null ? sc.getNom() : null)
                .competenceNom(c != null ? c.getNom() : null)
                .domaineNom(d != null ? d.getNom() : null)
                .niveau(ec.getNiveau())
                .dateAcquisition(ec.getDateAcquisition())
                .commentaire(ec.getCommentaire())
                .build();
    }
}
