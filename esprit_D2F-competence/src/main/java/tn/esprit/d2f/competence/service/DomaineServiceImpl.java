package tn.esprit.d2f.competence.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.esprit.d2f.competence.dto.DomaineDTO;
import tn.esprit.d2f.competence.dto.DomaineRequest;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.repository.DomaineRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DomaineServiceImpl implements IDomaineService {

    private final DomaineRepository domaineRepository;
    private final EnseignantCompetenceRepository enseignantCompetenceRepository;
    private final CompetenceMapper competenceMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<DomaineDTO> getAllDomaines(Pageable pageable) {
        return domaineRepository.findAll(pageable)
                .map(competenceMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable("domaines-actifs")
    public List<DomaineDTO> getDomainesActifs() {
        return domaineRepository.findByActifTrue().stream()
                .map(competenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public DomaineDTO getDomaineById(Long id) {
        Domaine domaine = domaineRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Domaine non trouvé avec l'id: " + id));
        return competenceMapper.toDTO(domaine);
    }

    @Override
    @Transactional(readOnly = true)
    public DomaineDTO getDomaineByCode(String code) {
        Domaine domaine = domaineRepository.findByCode(code)
                .orElseThrow(() -> new EntityNotFoundException("Domaine non trouvé avec le code: " + code));
        return competenceMapper.toDTO(domaine);
    }

    @Override
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "domaines-actifs", allEntries = true),
        @CacheEvict(value = "competences-by-domaine", allEntries = true)
    })
    public DomaineDTO createDomaine(DomaineRequest request) {
        if (domaineRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Un domaine avec le code '" + request.getCode() + "' existe déjà");
        }
        Domaine domaine = Domaine.builder()
                .code(request.getCode())
                .nom(request.getNom())
                .description(request.getDescription())
                .actif(request.getActif() != null ? request.getActif() : true)
                .build();
        Domaine saved = domaineRepository.save(domaine);
        log.info("Domaine créé: {} ({})", saved.getNom(), saved.getCode());
        return competenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "domaines-actifs", allEntries = true),
        @CacheEvict(value = "competences-by-domaine", allEntries = true)
    })
    public DomaineDTO updateDomaine(Long id, DomaineRequest request) {
        Domaine existing = domaineRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Domaine non trouvé avec l'id: " + id));
        existing.setCode(request.getCode());
        existing.setNom(request.getNom());
        existing.setDescription(request.getDescription());
        if (request.getActif() != null) {
            existing.setActif(request.getActif());
        }
        Domaine saved = domaineRepository.save(existing);
        log.info("Domaine mis à jour: {}", saved.getId());
        return competenceMapper.toDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DomaineDTO> searchDomaines(String keyword) {
        return domaineRepository.searchByKeyword(keyword).stream()
                .map(competenceMapper::toDTOLight)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DomaineDTO> searchDomaines(String keyword, Pageable pageable) {
        return domaineRepository.searchByKeyword(keyword, pageable)
                .map(competenceMapper::toDTOLight);
    }

    @Override
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "domaines-actifs", allEntries = true),
        @CacheEvict(value = "competences-by-domaine", allEntries = true)
    })
    public void deleteDomaine(Long id) {
        if (!domaineRepository.existsById(id)) {
            throw new EntityNotFoundException("Domaine non trouvé avec l'id: " + id);
        }
        // Supprimer les affectations enseignant-compétence liées aux savoirs de ce domaine
        List<Long> savoirIds = enseignantCompetenceRepository.findSavoirIdsByDomaineId(id);
        if (!savoirIds.isEmpty()) {
            enseignantCompetenceRepository.deleteBySavoirIdIn(savoirIds);
        }
        domaineRepository.deleteById(id);
        log.info("Domaine supprimé: {}", id);
    }

    @Override
    @Transactional
    @CacheEvict(value = "domaines-actifs", allEntries = true)
    public DomaineDTO toggleActif(Long id) {
        Domaine domaine = domaineRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Domaine non trouvé avec l'id: " + id));
        domaine.setActif(!domaine.getActif());
        Domaine saved = domaineRepository.save(domaine);
        log.info("Domaine {} -> actif={}", saved.getId(), saved.getActif());
        return competenceMapper.toDTOLight(saved);
    }
}
