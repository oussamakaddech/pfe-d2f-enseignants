package tn.esprit.d2f.competence.service;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tn.esprit.d2f.competence.dto.DomaineDTO;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.repository.DomaineRepository;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class DomaineServiceImpl implements IDomaineService {

    @Autowired
    private DomaineRepository domaineRepository;

    @Override
    public List<DomaineDTO> getAllDomaines() {
        return domaineRepository.findAll().stream()
                .map(CompetenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<DomaineDTO> getDomainesActifs() {
        return domaineRepository.findByActifTrue().stream()
                .map(CompetenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public DomaineDTO getDomaineById(Long id) {
        Domaine domaine = domaineRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Domaine non trouvé avec l'id: " + id));
        return CompetenceMapper.toDTO(domaine);
    }

    @Override
    public DomaineDTO getDomaineByCode(String code) {
        Domaine domaine = domaineRepository.findByCode(code)
                .orElseThrow(() -> new EntityNotFoundException("Domaine non trouvé avec le code: " + code));
        return CompetenceMapper.toDTO(domaine);
    }

    @Override
    @Transactional
    public DomaineDTO createDomaine(Domaine domaine) {
        if (domaineRepository.existsByCode(domaine.getCode())) {
            throw new IllegalArgumentException("Un domaine avec le code '" + domaine.getCode() + "' existe déjà");
        }
        Domaine saved = domaineRepository.save(domaine);
        log.info("Domaine créé: {} ({})", saved.getNom(), saved.getCode());
        return CompetenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    public DomaineDTO updateDomaine(Long id, Domaine domaine) {
        Domaine existing = domaineRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Domaine non trouvé avec l'id: " + id));
        existing.setCode(domaine.getCode());
        existing.setNom(domaine.getNom());
        existing.setDescription(domaine.getDescription());
        if (domaine.getActif() != null) {
            existing.setActif(domaine.getActif());
        }
        Domaine saved = domaineRepository.save(existing);
        log.info("Domaine mis à jour: {}", saved.getId());
        return CompetenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    public void deleteDomaine(Long id) {
        if (!domaineRepository.existsById(id)) {
            throw new EntityNotFoundException("Domaine non trouvé avec l'id: " + id);
        }
        domaineRepository.deleteById(id);
        log.info("Domaine supprimé: {}", id);
    }

    @Override
    @Transactional
    public DomaineDTO toggleActif(Long id) {
        Domaine domaine = domaineRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Domaine non trouvé avec l'id: " + id));
        domaine.setActif(!domaine.getActif());
        Domaine saved = domaineRepository.save(domaine);
        log.info("Domaine {} -> actif={}", saved.getId(), saved.getActif());
        return CompetenceMapper.toDTOLight(saved);
    }
}
