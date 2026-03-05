package tn.esprit.d2f.competence.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.esprit.d2f.competence.dto.SousCompetenceDTO;
import tn.esprit.d2f.competence.dto.SousCompetenceRequest;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.SousCompetence;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;
import tn.esprit.d2f.competence.repository.SousCompetenceRepository;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SousCompetenceServiceImpl implements ISousCompetenceService {

    private final SousCompetenceRepository sousCompetenceRepository;
    private final CompetenceRepository competenceRepository;
    private final EnseignantCompetenceRepository enseignantCompetenceRepository;
    private final CompetenceMapper competenceMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<SousCompetenceDTO> getAllSousCompetences(Pageable pageable) {
        return sousCompetenceRepository.findAll(pageable)
                .map(competenceMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SousCompetenceDTO> getSousCompetencesByCompetence(Long competenceId) {
        return sousCompetenceRepository.findByCompetenceId(competenceId).stream()
                .map(competenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public SousCompetenceDTO getSousCompetenceById(Long id) {
        SousCompetence sc = sousCompetenceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Sous-compétence non trouvée avec l'id: " + id));
        return competenceMapper.toDTO(sc);
    }

    @Override
    @Transactional
    public SousCompetenceDTO createSousCompetence(Long competenceId, SousCompetenceRequest request) {
        Competence competence = competenceRepository.findById(competenceId)
                .orElseThrow(() -> new EntityNotFoundException("Compétence non trouvée avec l'id: " + competenceId));
        if (sousCompetenceRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Une sous-compétence avec le code '" + request.getCode() + "' existe déjà");
        }
        SousCompetence sousCompetence = SousCompetence.builder()
                .code(request.getCode())
                .nom(request.getNom())
                .description(request.getDescription())
                .competence(competence)
                .build();
        SousCompetence saved = sousCompetenceRepository.save(sousCompetence);
        log.info("Sous-compétence créée: {} dans compétence {}", saved.getNom(), competence.getNom());
        return competenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    public SousCompetenceDTO updateSousCompetence(Long id, SousCompetenceRequest request) {
        SousCompetence existing = sousCompetenceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Sous-compétence non trouvée avec l'id: " + id));
        existing.setCode(request.getCode());
        existing.setNom(request.getNom());
        existing.setDescription(request.getDescription());
        SousCompetence saved = sousCompetenceRepository.save(existing);
        log.info("Sous-compétence mise à jour: {}", saved.getId());
        return competenceMapper.toDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SousCompetenceDTO> searchSousCompetences(String keyword) {
        return sousCompetenceRepository.searchByKeyword(keyword).stream()
                .map(competenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SousCompetenceDTO> searchSousCompetences(String keyword, Pageable pageable) {
        return sousCompetenceRepository.searchByKeyword(keyword, pageable)
                .map(competenceMapper::toDTO);
    }

    @Override
    @Transactional
    public void deleteSousCompetence(Long id) {
        if (!sousCompetenceRepository.existsById(id)) {
            throw new EntityNotFoundException("Sous-compétence non trouvée avec l'id: " + id);
        }
        // Supprimer les affectations enseignant-compétence liées aux savoirs de cette sous-compétence
        List<Long> savoirIds = enseignantCompetenceRepository.findSavoirIdsBySousCompetenceId(id);
        if (!savoirIds.isEmpty()) {
            enseignantCompetenceRepository.deleteBySavoirIdIn(savoirIds);
        }
        sousCompetenceRepository.deleteById(id);
        log.info("Sous-compétence supprimée: {}", id);
    }
}
