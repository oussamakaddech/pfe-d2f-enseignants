package tn.esprit.d2f.competence.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tn.esprit.d2f.competence.dto.SousCompetenceDTO;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.SousCompetence;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.SousCompetenceRepository;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class SousCompetenceServiceImpl implements ISousCompetenceService {

    @Autowired
    private SousCompetenceRepository sousCompetenceRepository;

    @Autowired
    private CompetenceRepository competenceRepository;

    @Override
    @Transactional(readOnly = true)
    public List<SousCompetenceDTO> getAllSousCompetences() {
        return sousCompetenceRepository.findAll().stream()
                .map(CompetenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SousCompetenceDTO> getSousCompetencesByCompetence(Long competenceId) {
        return sousCompetenceRepository.findByCompetenceId(competenceId).stream()
                .map(CompetenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public SousCompetenceDTO getSousCompetenceById(Long id) {
        SousCompetence sc = sousCompetenceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Sous-compétence non trouvée avec l'id: " + id));
        return CompetenceMapper.toDTO(sc);
    }

    @Override
    @Transactional
    public SousCompetenceDTO createSousCompetence(Long competenceId, SousCompetence sousCompetence) {
        Competence competence = competenceRepository.findById(competenceId)
                .orElseThrow(() -> new EntityNotFoundException("Compétence non trouvée avec l'id: " + competenceId));
        if (sousCompetenceRepository.existsByCode(sousCompetence.getCode())) {
            throw new IllegalArgumentException("Une sous-compétence avec le code '" + sousCompetence.getCode() + "' existe déjà");
        }
        sousCompetence.setCompetence(competence);
        SousCompetence saved = sousCompetenceRepository.save(sousCompetence);
        log.info("Sous-compétence créée: {} dans compétence {}", saved.getNom(), competence.getNom());
        return CompetenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    public SousCompetenceDTO updateSousCompetence(Long id, SousCompetence sousCompetence) {
        SousCompetence existing = sousCompetenceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Sous-compétence non trouvée avec l'id: " + id));
        existing.setCode(sousCompetence.getCode());
        existing.setNom(sousCompetence.getNom());
        existing.setDescription(sousCompetence.getDescription());
        SousCompetence saved = sousCompetenceRepository.save(existing);
        log.info("Sous-compétence mise à jour: {}", saved.getId());
        return CompetenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    public void deleteSousCompetence(Long id) {
        if (!sousCompetenceRepository.existsById(id)) {
            throw new EntityNotFoundException("Sous-compétence non trouvée avec l'id: " + id);
        }
        sousCompetenceRepository.deleteById(id);
        log.info("Sous-compétence supprimée: {}", id);
    }
}
