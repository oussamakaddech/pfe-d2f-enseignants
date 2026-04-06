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
import tn.esprit.d2f.competence.dto.EnseignantCompetenceDTO;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceRequest;
import tn.esprit.d2f.competence.entity.EnseignantCompetence;
import tn.esprit.d2f.competence.entity.Savoir;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EnseignantCompetenceServiceImpl implements IEnseignantCompetenceService {

    private final EnseignantCompetenceRepository enseignantCompetenceRepository;
    private final SavoirRepository savoirRepository;
    private final CompetenceMapper competenceMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<EnseignantCompetenceDTO> getAll(Pageable pageable) {
        // findAllFetched uses JOIN FETCH to load the full savoir→sousCompetence→competence→domaine
        // graph in a single query, eliminating the N+1 problem.
        return enseignantCompetenceRepository.findAllFetched(pageable)
                .map(competenceMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnseignantCompetenceDTO> getCompetencesByEnseignant(String enseignantId) {
        return enseignantCompetenceRepository.findByEnseignantId(enseignantId).stream()
                .map(competenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnseignantCompetenceDTO> getCompetencesByEnseignantAndDomaine(String enseignantId, Long domaineId) {
        return enseignantCompetenceRepository.findByEnseignantIdAndDomaineId(enseignantId, domaineId).stream()
                .map(competenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnseignantCompetenceDTO> getCompetencesByEnseignantAndCompetence(String enseignantId, Long competenceId) {
        return enseignantCompetenceRepository.findByEnseignantIdAndCompetenceId(enseignantId, competenceId).stream()
                .map(competenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnseignantCompetenceDTO> getCompetencesByEnseignantAndNiveau(String enseignantId, NiveauMaitrise niveau) {
        return enseignantCompetenceRepository.findByEnseignantIdAndNiveau(enseignantId, niveau).stream()
                .map(competenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @CacheEvict(value = "ec-count", allEntries = true)
    public EnseignantCompetenceDTO assignCompetence(EnseignantCompetenceRequest request) {
        // Vérifier que le savoir existe
        Savoir savoir = savoirRepository.findById(request.getSavoirId())
                .orElseThrow(() -> new EntityNotFoundException("Savoir non trouvé avec l'id: " + request.getSavoirId()));

        // Vérifier doublon
        if (enseignantCompetenceRepository.existsByEnseignantIdAndSavoirId(request.getEnseignantId(), request.getSavoirId())) {
            throw new IllegalArgumentException("L'enseignant possède déjà ce savoir. Utilisez la mise à jour de niveau.");
        }

        EnseignantCompetence ec = EnseignantCompetence.builder()
                .enseignantId(request.getEnseignantId())
                .savoir(savoir)
                .niveau(request.getNiveau() != null ? request.getNiveau() : NiveauMaitrise.N1_DEBUTANT)
                .dateAcquisition(request.getDateAcquisition())
                .commentaire(request.getCommentaire())
                .build();

        EnseignantCompetence saved = enseignantCompetenceRepository.save(ec);
        log.info("Compétence assignée: enseignant={}, savoir={}, niveau={}", 
                saved.getEnseignantId(), savoir.getNom(), saved.getNiveau());
        return competenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = "ec-count", allEntries = true)
    public EnseignantCompetenceDTO updateNiveau(Long id, NiveauMaitrise niveau) {
        EnseignantCompetence ec = enseignantCompetenceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("EnseignantCompetence non trouvée avec l'id: " + id));
        ec.setNiveau(niveau);
        EnseignantCompetence saved = enseignantCompetenceRepository.save(ec);
        log.info("Niveau mis à jour: id={}, nouveau niveau={}", id, niveau);
        return competenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = "ec-count", allEntries = true)
    public void removeCompetence(Long id) {
        if (!enseignantCompetenceRepository.existsById(id)) {
            throw new EntityNotFoundException("EnseignantCompetence non trouvée avec l'id: " + id);
        }
        enseignantCompetenceRepository.deleteById(id);
        log.info("Compétence enseignant supprimée: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "ec-count", key = "#enseignantId")
    public long countCompetences(String enseignantId) {
        return enseignantCompetenceRepository.countByEnseignantId(enseignantId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnseignantCompetenceDTO> getByCompetenceId(Long competenceId) {
        return enseignantCompetenceRepository.findByCompetenceId(competenceId).stream()
                .map(competenceMapper::toDTO)
                .collect(Collectors.toList());
    }
}
