package tn.esprit.d2f.competence.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tn.esprit.d2f.competence.dto.CompetenceDTO;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.DomaineRepository;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class CompetenceServiceImpl implements ICompetenceService {

    @Autowired
    private CompetenceRepository competenceRepository;

    @Autowired
    private DomaineRepository domaineRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CompetenceDTO> getAllCompetences() {
        return competenceRepository.findAll().stream()
                .map(CompetenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompetenceDTO> getCompetencesByDomaine(Long domaineId) {
        return competenceRepository.findByDomaineId(domaineId).stream()
                .map(CompetenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public CompetenceDTO getCompetenceById(Long id) {
        Competence c = competenceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Compétence non trouvée avec l'id: " + id));
        return CompetenceMapper.toDTO(c);
    }

    @Override
    @Transactional
    public CompetenceDTO createCompetence(Long domaineId, Competence competence) {
        Domaine domaine = domaineRepository.findById(domaineId)
                .orElseThrow(() -> new EntityNotFoundException("Domaine non trouvé avec l'id: " + domaineId));
        if (competenceRepository.existsByCode(competence.getCode())) {
            throw new IllegalArgumentException("Une compétence avec le code '" + competence.getCode() + "' existe déjà");
        }
        competence.setDomaine(domaine);
        Competence saved = competenceRepository.save(competence);
        log.info("Compétence créée: {} dans domaine {}", saved.getNom(), domaine.getNom());
        return CompetenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    public CompetenceDTO updateCompetence(Long id, Competence competence) {
        Competence existing = competenceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Compétence non trouvée avec l'id: " + id));
        existing.setCode(competence.getCode());
        existing.setNom(competence.getNom());
        existing.setDescription(competence.getDescription());
        existing.setOrdre(competence.getOrdre());
        Competence saved = competenceRepository.save(existing);
        log.info("Compétence mise à jour: {}", saved.getId());
        return CompetenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    public void deleteCompetence(Long id) {
        if (!competenceRepository.existsById(id)) {
            throw new EntityNotFoundException("Compétence non trouvée avec l'id: " + id);
        }
        competenceRepository.deleteById(id);
        log.info("Compétence supprimée: {}", id);
    }
}
