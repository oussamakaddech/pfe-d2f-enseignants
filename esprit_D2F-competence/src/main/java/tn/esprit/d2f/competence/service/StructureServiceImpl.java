package tn.esprit.d2f.competence.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.d2f.competence.dto.*;
import tn.esprit.d2f.competence.entity.*;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;
import tn.esprit.d2f.competence.repository.*;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class StructureServiceImpl implements IStructureService {

    @Autowired
    private DomaineRepository domaineRepository;

    @Autowired
    private CompetenceRepository competenceRepository;

    @Autowired
    private SousCompetenceRepository sousCompetenceRepository;

    @Autowired
    private SavoirRepository savoirRepository;

    @Autowired
    private EnseignantCompetenceRepository enseignantCompetenceRepository;

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
    public Map<String, Object> rechercheGlobale(String keyword) {
        Map<String, Object> results = new LinkedHashMap<>();
        results.put("domaines", domaineRepository.searchByKeyword(keyword).stream()
                .map(CompetenceMapper::toDTOLight).collect(Collectors.toList()));
        results.put("competences", competenceRepository.searchByKeyword(keyword).stream()
                .map(CompetenceMapper::toDTO).collect(Collectors.toList()));
        results.put("sousCompetences", sousCompetenceRepository.searchByKeyword(keyword).stream()
                .map(CompetenceMapper::toDTO).collect(Collectors.toList()));
        results.put("savoirs", savoirRepository.searchByKeyword(keyword).stream()
                .map(CompetenceMapper::toDTO).collect(Collectors.toList()));
        return results;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> rechercheParDomaine(Long domaineId, String keyword) {
        Map<String, Object> results = new LinkedHashMap<>();

        List<Competence> competences = competenceRepository.findByDomaineId(domaineId);
        List<CompetenceDTO> matchingCompetences = competences.stream()
                .filter(c -> matchesKeyword(c.getNom(), c.getDescription(), c.getCode(), keyword))
                .map(CompetenceMapper::toDTO)
                .collect(Collectors.toList());

        List<SousCompetenceDTO> matchingSousCompetences = new ArrayList<>();
        List<SavoirDTO> matchingSavoirs = new ArrayList<>();

        for (Competence comp : competences) {
            // Savoirs directement rattachés à la compétence (sans sous-compétence)
            if (comp.getSavoirs() != null) {
                for (Savoir s : comp.getSavoirs()) {
                    if (matchesKeyword(s.getNom(), s.getDescription(), s.getCode(), keyword)) {
                        matchingSavoirs.add(CompetenceMapper.toDTO(s));
                    }
                }
            }
            // Sous-compétences et leurs savoirs
            for (SousCompetence sc : comp.getSousCompetences()) {
                if (matchesKeyword(sc.getNom(), sc.getDescription(), sc.getCode(), keyword)) {
                    matchingSousCompetences.add(CompetenceMapper.toDTO(sc));
                }
                for (Savoir s : sc.getSavoirs()) {
                    if (matchesKeyword(s.getNom(), s.getDescription(), s.getCode(), keyword)) {
                        matchingSavoirs.add(CompetenceMapper.toDTO(s));
                    }
                }
            }
        }

        results.put("competences", matchingCompetences);
        results.put("sousCompetences", matchingSousCompetences);
        results.put("savoirs", matchingSavoirs);
        return results;
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
                ? competence.getSavoirs().stream().map(CompetenceMapper::toDTO).collect(Collectors.toList())
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
                .savoirs(sc.getSavoirs().stream().map(CompetenceMapper::toDTO).collect(Collectors.toList()))
                .build();
    }

    private boolean matchesKeyword(String nom, String description, String code, String keyword) {
        String kw = keyword.toLowerCase();
        return (nom != null && nom.toLowerCase().contains(kw))
                || (description != null && description.toLowerCase().contains(kw))
                || (code != null && code.toLowerCase().contains(kw));
    }
}
