package tn.esprit.d2f.competence.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.d2f.competence.dto.*;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.entity.Savoir;
import tn.esprit.d2f.competence.entity.SousCompetence;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;
import tn.esprit.d2f.competence.repository.*;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StructureServiceImpl implements IStructureService {

    private final DomaineRepository domaineRepository;
    private final CompetenceRepository competenceRepository;
    private final SousCompetenceRepository sousCompetenceRepository;
    private final SavoirRepository savoirRepository;
    private final EnseignantCompetenceRepository enseignantCompetenceRepository;
    private final CompetenceMapper competenceMapper;

    @Override
    @Transactional(readOnly = true)
    public StructureArbreDTO getStructureComplete() {
        List<Domaine> domaines = domaineRepository.findAll();
        List<Savoir> allSavoirs = savoirRepository.findAll();

        List<StructureArbreDTO.DomaineArbreDTO> domaineArbreDTOs = domaines.stream()
                .map(this::buildDomaineArbre)
                .collect(Collectors.toList());

        long savoirsTheoriques = allSavoirs.stream().filter(s -> s.getType() == TypeSavoir.THEORIQUE).count();
        long savoirsPratiques = allSavoirs.stream().filter(s -> s.getType() == TypeSavoir.PRATIQUE).count();

        StructureArbreDTO.StatistiquesDTO stats = StructureArbreDTO.StatistiquesDTO.builder()
                .totalDomaines(domaines.size())
                .totalCompetences((int) competenceRepository.count())
                .totalSousCompetences((int) sousCompetenceRepository.count())
                .totalSavoirs(allSavoirs.size())
                .totalSavoirsTheoriques((int) savoirsTheoriques)
                .totalSavoirsPratiques((int) savoirsPratiques)
                .build();

        return StructureArbreDTO.builder()
                .domaines(domaineArbreDTOs)
                .statistiques(stats)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public StructureArbreDTO.DomaineArbreDTO getStructureDomaine(Long domaineId) {
        Domaine domaine = domaineRepository.findById(domaineId)
                .orElseThrow(() -> new EntityNotFoundException("Domaine non trouvé avec l'id: " + domaineId));
        return buildDomaineArbre(domaine);
    }

    @Override
    @Transactional(readOnly = true)
    public SearchResultDTO rechercheGlobale(String keyword) {
        List<DomaineDTO> domaines = domaineRepository.searchByKeyword(keyword).stream()
                .map(competenceMapper::toDTOLight).collect(Collectors.toList());
        List<CompetenceDTO> competences = competenceRepository.searchByKeyword(keyword).stream()
                .map(competenceMapper::toDTO).collect(Collectors.toList());
        List<SousCompetenceDTO> sousCompetences = sousCompetenceRepository.searchByKeyword(keyword).stream()
                .map(competenceMapper::toDTO).collect(Collectors.toList());
        List<SavoirDTO> savoirs = savoirRepository.searchByKeyword(keyword).stream()
                .map(competenceMapper::toDTO).collect(Collectors.toList());
        return SearchResultDTO.builder()
                .keyword(keyword)
                .domaines(domaines)
                .competences(competences)
                .sousCompetences(sousCompetences)
                .savoirs(savoirs)
                .totalResults(domaines.size() + competences.size() + sousCompetences.size() + savoirs.size())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public SearchResultDTO rechercheParDomaine(Long domaineId, String keyword) {
        List<CompetenceDTO> competences = competenceRepository.searchByDomaineIdAndKeyword(domaineId, keyword).stream()
                .map(competenceMapper::toDTO).collect(Collectors.toList());
        List<SousCompetenceDTO> sousCompetences = sousCompetenceRepository.searchByDomaineIdAndKeyword(domaineId, keyword).stream()
                .map(competenceMapper::toDTO).collect(Collectors.toList());
        List<SavoirDTO> savoirs = savoirRepository.searchByDomaineIdAndKeyword(domaineId, keyword).stream()
                .map(competenceMapper::toDTO).collect(Collectors.toList());
        return SearchResultDTO.builder()
                .keyword(keyword)
                .domaines(java.util.Collections.emptyList())
                .competences(competences)
                .sousCompetences(sousCompetences)
                .savoirs(savoirs)
                .totalResults(competences.size() + sousCompetences.size() + savoirs.size())
                .build();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private StructureArbreDTO.DomaineArbreDTO buildDomaineArbre(Domaine domaine) {
        List<Competence> competences = domaine.getCompetences();

        List<StructureArbreDTO.CompetenceArbreDTO> compArbreDTOs = competences.stream()
                .map(this::buildCompetenceArbre)
                .collect(Collectors.toList());

        long nbEnseignants;
        try {
            nbEnseignants = enseignantCompetenceRepository.countDistinctEnseignantsByDomaineId(domaine.getId());
        } catch (Exception e) {
            nbEnseignants = 0;
        }

        return StructureArbreDTO.DomaineArbreDTO.builder()
                .id(domaine.getId())
                .code(domaine.getCode())
                .nom(domaine.getNom())
                .description(domaine.getDescription())
                .actif(domaine.getActif())
                .nombreCompetences(competences.size())
                .nombreEnseignants(nbEnseignants)
                .competences(compArbreDTOs)
                .build();
    }

    private StructureArbreDTO.CompetenceArbreDTO buildCompetenceArbre(Competence competence) {
        List<SousCompetence> sousCompetences = competence.getSousCompetences();

        List<StructureArbreDTO.SousCompetenceArbreDTO> scArbreDTOs = sousCompetences.stream()
                .map(this::buildSousCompetenceArbre)
                .collect(Collectors.toList());

        List<SavoirDTO> savoirsDirect = competence.getSavoirs() != null
                ? competence.getSavoirs().stream().map(competenceMapper::toDTO).collect(Collectors.toList())
                : Collections.emptyList();

        int totalSavoirs = sousCompetences.stream().mapToInt(sc -> sc.getSavoirs().size()).sum()
                + savoirsDirect.size();

        long nbEnseignants;
        try {
            nbEnseignants = enseignantCompetenceRepository.countDistinctEnseignantsByCompetenceId(competence.getId());
        } catch (Exception e) {
            nbEnseignants = 0;
        }

        return StructureArbreDTO.CompetenceArbreDTO.builder()
                .id(competence.getId())
                .code(competence.getCode())
                .nom(competence.getNom())
                .description(competence.getDescription())
                .ordre(competence.getOrdre())
                .nombreSousCompetences(sousCompetences.size())
                .nombreSavoirs(totalSavoirs)
                .nombreEnseignants(nbEnseignants)
                .sousCompetences(scArbreDTOs)
                .savoirsDirect(savoirsDirect)
                .build();
    }

    private StructureArbreDTO.SousCompetenceArbreDTO buildSousCompetenceArbre(SousCompetence sc) {
        long nbEnseignants;
        try {
            nbEnseignants = enseignantCompetenceRepository.countDistinctEnseignantsBySousCompetenceId(sc.getId());
        } catch (Exception e) {
            nbEnseignants = 0;
        }

        return StructureArbreDTO.SousCompetenceArbreDTO.builder()
                .id(sc.getId())
                .code(sc.getCode())
                .nom(sc.getNom())
                .description(sc.getDescription())
                .nombreSavoirs(sc.getSavoirs().size())
                .nombreEnseignants(nbEnseignants)
                .savoirs(sc.getSavoirs().stream().map(competenceMapper::toDTO).collect(Collectors.toList()))
                .build();
    }

}
