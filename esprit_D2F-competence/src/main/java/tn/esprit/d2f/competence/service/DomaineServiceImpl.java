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
import tn.esprit.d2f.competence.repository.CompetencePrerequisiteRepository;
import tn.esprit.d2f.competence.repository.DomaineRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;
import tn.esprit.d2f.competence.repository.NiveauSavoirRequisRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DomaineServiceImpl implements IDomaineService {

    private static final String DOMAINE_NOT_FOUND = "Domaine non trouvé avec l'id: ";

    private final DomaineRepository domaineRepository;
    private final EnseignantCompetenceRepository enseignantCompetenceRepository;
    private final NiveauSavoirRequisRepository niveauRepo;
    private final SavoirRepository savoirRepository;
    private final CompetencePrerequisiteRepository prerequisiteRepository;
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
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DomaineDTO> getDomainesActifs(Pageable pageable) {
        return domaineRepository.findByActifTrue(pageable)
                .map(competenceMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public DomaineDTO getDomaineById(Long id) {
        Domaine domaine = domaineRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(DOMAINE_NOT_FOUND + id));
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
                .actif(request.getActif() != Boolean.FALSE)
                .upId(request.getUpId())
                .departementId(request.getDepartementId())
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
                .orElseThrow(() -> new EntityNotFoundException(DOMAINE_NOT_FOUND + id));
        if (!existing.getCode().equals(request.getCode()) && domaineRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Un domaine avec le code '" + request.getCode() + "' existe déjà");
        }
        existing.setCode(request.getCode());
        existing.setNom(request.getNom());
        existing.setDescription(request.getDescription());
        if (request.getActif() != null) existing.setActif(request.getActif());
        existing.setUpId(request.getUpId());
        existing.setDepartementId(request.getDepartementId());
        Domaine saved = domaineRepository.save(existing);
        log.info("Domaine mis à jour: {}", saved.getId());
        return competenceMapper.toDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DomaineDTO> searchDomaines(String keyword) {
        return domaineRepository.searchByKeyword(keyword).stream()
                .map(competenceMapper::toDTOLight)
                .toList();
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
            throw new EntityNotFoundException(DOMAINE_NOT_FOUND + id);
        }
        // 1. Supprimer les affectations enseignant-compétence (couvre les deux
        //    chemins : savoir direct sur compétence ET via sous-compétence).
        enseignantCompetenceRepository.deleteByDomaineIdDirectSavoirs(id);
        enseignantCompetenceRepository.deleteByDomaineIdViaSousCompetence(id);
        // 2. Supprimer les niveau_savoir_requis (tous les chemins)
        niveauRepo.deleteByCompetence_DomaineId(id);
        niveauRepo.deleteBySousCompetence_Competence_DomaineId(id);
        List<Long> allSavoirIds = savoirRepository.findIdsByDomaineId(id);
        if (!allSavoirIds.isEmpty()) {
            niveauRepo.deleteBySavoirIdIn(allSavoirIds);
        }
        // 3. Supprimer les prérequis liés aux compétences du domaine
        prerequisiteRepository.deleteByCompetence_DomaineId(id);
        // 4. Hibernate cascade: domaines → competences → sous_competences, savoirs
        domaineRepository.deleteById(id);
        log.info("Domaine supprimé: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DomaineDTO> getDomainesByFilter(String upId, String departementId) {
        return domaineRepository.findByUpIdAndDepartementId(upId, departementId).stream()
                .map(competenceMapper::toDTO).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DomaineDTO> getDomainesByFilter(String upId, String departementId, Pageable pageable) {
        return domaineRepository.findByUpIdAndDepartementId(upId, departementId, pageable)
                .map(competenceMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DomaineDTO> getDomainesActifsByFilter(String upId, String departementId) {
        return domaineRepository.findActifsByUpIdAndDepartementId(upId, departementId).stream()
                .map(competenceMapper::toDTO).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DomaineDTO> getDomainesActifsByFilter(String upId, String departementId, Pageable pageable) {
        return domaineRepository.findActifsByUpIdAndDepartementId(upId, departementId, pageable)
                .map(competenceMapper::toDTO);
    }

    @Override
    @Transactional
    @CacheEvict(value = "domaines-actifs", allEntries = true)
    public DomaineDTO toggleActif(Long id) {
        Domaine domaine = domaineRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(DOMAINE_NOT_FOUND + id));
        domaine.setActif(!domaine.getActif());
        Domaine saved = domaineRepository.save(domaine);
        log.info("Domaine {} -> actif={}", saved.getId(), saved.getActif());
        return competenceMapper.toDTOLight(saved);
    }
}
