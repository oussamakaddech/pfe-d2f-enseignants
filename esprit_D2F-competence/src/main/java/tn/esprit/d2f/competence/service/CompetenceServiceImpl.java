package tn.esprit.d2f.competence.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.esprit.d2f.competence.dto.CompetenceDTO;
import tn.esprit.d2f.competence.dto.CompetenceRequest;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.exception.BusinessException;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.CompetencePrerequisiteRepository;
import tn.esprit.d2f.competence.repository.DomaineRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;
import tn.esprit.d2f.competence.repository.SousCompetenceRepository;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompetenceServiceImpl implements ICompetenceService {

    private final CompetenceRepository competenceRepository;
    private final DomaineRepository domaineRepository;
    private final CompetencePrerequisiteRepository prerequisiteRepository;
    private final EnseignantCompetenceRepository enseignantCompetenceRepository;
    private final SavoirRepository savoirRepository;
    private final SousCompetenceRepository sousCompetenceRepository;
    private final CompetenceMapper competenceMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<CompetenceDTO> getAllCompetences(Pageable pageable) {
        return competenceRepository.findAllWithDomaine(pageable)
                .map(c -> {
                    CompetenceDTO dto = competenceMapper.toDTO(c);
                    dto.setPrerequisiteCount(prerequisiteRepository.countByCompetenceId(c.getId()));
                    dto.setPrerequisiteNames(prerequisiteRepository.findPrerequisiteNamesByCompetenceId(c.getId()));
                    return dto;
                });
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "competences-by-domaine", key = "#domaineId")
    public List<CompetenceDTO> getCompetencesByDomaine(Long domaineId) {
        return competenceRepository.findByDomaineIdWithDomaine(domaineId).stream()
                .map(c -> {
                    CompetenceDTO dto = competenceMapper.toDTO(c);
                    dto.setPrerequisiteCount(prerequisiteRepository.countByCompetenceId(c.getId()));
                    dto.setPrerequisiteNames(prerequisiteRepository.findPrerequisiteNamesByCompetenceId(c.getId()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public CompetenceDTO getCompetenceById(Long id) {
        Competence c = competenceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Compétence non trouvée avec l'id: " + id));
        CompetenceDTO dto = competenceMapper.toDTO(c);
        dto.setNbEnseignants(enseignantCompetenceRepository.countDistinctEnseignantsByCompetenceId(id));
        dto.setPrerequisiteCount(prerequisiteRepository.countByCompetenceId(id));
        dto.setPrerequisiteNames(prerequisiteRepository.findPrerequisiteNamesByCompetenceId(id));
        return dto;
    }

    @Override
    @Transactional
    @CacheEvict(value = "competences-by-domaine", allEntries = true)
    public CompetenceDTO createCompetence(Long domaineId, CompetenceRequest request) {
        Domaine domaine = domaineRepository.findById(domaineId)
                .orElseThrow(() -> new EntityNotFoundException("Domaine non trouvé avec l'id: " + domaineId));
        if (competenceRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Une compétence avec le code '" + request.getCode() + "' existe déjà");
        }
        Competence competence = Competence.builder()
                .code(request.getCode())
                .nom(request.getNom())
                .description(request.getDescription())
            .prerequisiteManual(request.getPrerequisiteManual())
                .ordre(request.getOrdre() != null ? request.getOrdre() : 1)
                .domaine(domaine)
                .build();
        Competence saved = competenceRepository.save(competence);
        log.info("Compétence créée: {} dans domaine {}", saved.getNom(), domaine.getNom());
        return competenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = "competences-by-domaine", allEntries = true)
    public CompetenceDTO updateCompetence(Long id, CompetenceRequest request) {
        Competence existing = competenceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Compétence non trouvée avec l'id: " + id));
        existing.setCode(request.getCode());
        existing.setNom(request.getNom());
        existing.setDescription(request.getDescription());
        existing.setPrerequisiteManual(request.getPrerequisiteManual());
        if (request.getOrdre() != null) {
            existing.setOrdre(request.getOrdre());
        }
        Competence saved = competenceRepository.save(existing);
        log.info("Compétence mise à jour: {}", saved.getId());
        return competenceMapper.toDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompetenceDTO> searchCompetences(String keyword) {
        return competenceRepository.searchByKeyword(keyword).stream()
                .map(competenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CompetenceDTO> searchCompetences(String keyword, Pageable pageable) {
        return competenceRepository.searchByKeyword(keyword, pageable)
                .map(competenceMapper::toDTO);
    }

    @Override
    @Transactional
    @CacheEvict(value = "competences-by-domaine", allEntries = true)
    public void deleteCompetence(Long id) {
        Competence competence = competenceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Compétence non trouvée avec l'id: " + id));

        boolean hasSousCompetences = !sousCompetenceRepository.findByCompetenceId(id).isEmpty();
        boolean hasDirectSavoirs = savoirRepository.existsByCompetenceId(id);

        if (hasSousCompetences || hasDirectSavoirs) {
            throw new BusinessException(
                    "Suppression refusée: cette compétence contient des sous-compétences ou des savoirs. " +
                    "Supprimez d'abord ces éléments. Seules les lignes de prérequis liées seront supprimées automatiquement."
            );
        }

        competenceRepository.delete(competence);
        log.info("Compétence supprimée: {}", id);
    }
}
