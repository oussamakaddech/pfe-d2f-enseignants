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
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.DomaineRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;
import tn.esprit.d2f.competence.repository.NiveauSavoirRequisRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompetenceServiceImpl implements ICompetenceService {

    private final CompetenceRepository competenceRepository;
    private final DomaineRepository domaineRepository;
    private final EnseignantCompetenceRepository enseignantCompetenceRepository;
    private final NiveauSavoirRequisRepository niveauRepo;
    private final SavoirRepository savoirRepository;
    private final CompetenceMapper competenceMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<CompetenceDTO> getAllCompetences(Pageable pageable) {
        return competenceRepository.findAllWithDomaine(pageable)
                .map(competenceMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "competences-by-domaine", key = "#domaineId")
    public List<CompetenceDTO> getCompetencesByDomaine(Long domaineId) {
        return competenceRepository.findByDomaineIdWithDomaine(domaineId).stream()
                .map(competenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public CompetenceDTO getCompetenceById(Long id) {
        Competence c = competenceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Compétence non trouvée avec l'id: " + id));
        CompetenceDTO dto = competenceMapper.toDTO(c);
        dto.setNbEnseignants(enseignantCompetenceRepository.countDistinctEnseignantsByCompetenceId(id));
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
        if (!competenceRepository.existsById(id)) {
            throw new EntityNotFoundException("Compétence non trouvée avec l'id: " + id);
        }
        // 1. Supprimer les niveau_savoir_requis directement liés à cette compétence
        niveauRepo.deleteByCompetenceId(id);
        // 2. Supprimer les niveau_savoir_requis liés aux sous-compétences de cette compétence
        niveauRepo.deleteBySousCompetence_CompetenceId(id);
        // 2. Supprimer les niveau_savoir_requis liés aux savoirs de cette compétence
        // Savoirs via sous-compétences + savoirs directement rattachés à la compétence
        List<Long> savoirIdsViaSousComp = enseignantCompetenceRepository.findSavoirIdsByCompetenceId(id);
        List<Long> savoirIdsDirect = savoirRepository.findIdsByCompetenceId(id);
        List<Long> allSavoirIds = Stream.concat(savoirIdsViaSousComp.stream(), savoirIdsDirect.stream())
                .distinct()
                .collect(Collectors.toList());
        if (!allSavoirIds.isEmpty()) {
            niveauRepo.deleteBySavoirIdIn(allSavoirIds);
            enseignantCompetenceRepository.deleteBySavoirIdIn(allSavoirIds);
        }
        competenceRepository.deleteById(id);
        log.info("Compétence supprimée: {}", id);
    }
}
