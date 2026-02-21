package tn.esprit.d2f.competence.service;

import tn.esprit.d2f.competence.dto.*;
import tn.esprit.d2f.competence.entity.*;

import java.util.Collections;
import java.util.stream.Collectors;

/**
 * Utilitaire de mapping Entity <-> DTO
 */
public final class CompetenceMapper {

    private CompetenceMapper() {}

    // ─── Domaine ───
    public static DomaineDTO toDTO(Domaine d) {
        if (d == null) return null;
        return DomaineDTO.builder()
                .id(d.getId())
                .code(d.getCode())
                .nom(d.getNom())
                .description(d.getDescription())
                .actif(d.getActif())
                .competences(d.getCompetences() != null
                        ? d.getCompetences().stream().map(CompetenceMapper::toDTO).collect(Collectors.toList())
                        : Collections.emptyList())
                .build();
    }

    public static DomaineDTO toDTOLight(Domaine d) {
        if (d == null) return null;
        return DomaineDTO.builder()
                .id(d.getId())
                .code(d.getCode())
                .nom(d.getNom())
                .description(d.getDescription())
                .actif(d.getActif())
                .build();
    }

    // ─── Competence ───
    public static CompetenceDTO toDTO(Competence c) {
        if (c == null) return null;
        return CompetenceDTO.builder()
                .id(c.getId())
                .code(c.getCode())
                .nom(c.getNom())
                .description(c.getDescription())
                .ordre(c.getOrdre())
                .domaineId(c.getDomaine() != null ? c.getDomaine().getId() : null)
                .domaineNom(c.getDomaine() != null ? c.getDomaine().getNom() : null)
                .sousCompetences(c.getSousCompetences() != null
                        ? c.getSousCompetences().stream().map(CompetenceMapper::toDTO).collect(Collectors.toList())
                        : Collections.emptyList())
                .build();
    }

    // ─── SousCompetence ───
    public static SousCompetenceDTO toDTO(SousCompetence sc) {
        if (sc == null) return null;
        return SousCompetenceDTO.builder()
                .id(sc.getId())
                .code(sc.getCode())
                .nom(sc.getNom())
                .description(sc.getDescription())
                .competenceId(sc.getCompetence() != null ? sc.getCompetence().getId() : null)
                .competenceNom(sc.getCompetence() != null ? sc.getCompetence().getNom() : null)
                .savoirs(sc.getSavoirs() != null
                        ? sc.getSavoirs().stream().map(CompetenceMapper::toDTO).collect(Collectors.toList())
                        : Collections.emptyList())
                .build();
    }

    // ─── Savoir ───
    public static SavoirDTO toDTO(Savoir s) {
        if (s == null) return null;
        return SavoirDTO.builder()
                .id(s.getId())
                .code(s.getCode())
                .nom(s.getNom())
                .description(s.getDescription())
                .type(s.getType())
                .sousCompetenceId(s.getSousCompetence() != null ? s.getSousCompetence().getId() : null)
                .sousCompetenceNom(s.getSousCompetence() != null ? s.getSousCompetence().getNom() : null)
                .build();
    }

    // ─── EnseignantCompetence ───
    public static EnseignantCompetenceDTO toDTO(EnseignantCompetence ec) {
        if (ec == null) return null;
        Savoir s = ec.getSavoir();
        SousCompetence sc = s != null ? s.getSousCompetence() : null;
        Competence c = sc != null ? sc.getCompetence() : null;
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
