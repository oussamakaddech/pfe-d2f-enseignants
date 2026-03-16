package tn.esprit.d2f.competence.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.esprit.d2f.competence.exception.BusinessException;
import tn.esprit.d2f.competence.dto.SousCompetenceDTO;
import tn.esprit.d2f.competence.dto.SousCompetenceRequest;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.SousCompetence;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;
import tn.esprit.d2f.competence.repository.NiveauSavoirRequisRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;
import tn.esprit.d2f.competence.repository.SousCompetenceRepository;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SousCompetenceServiceImpl implements ISousCompetenceService {

    private static final int MAX_NIVEAU = 5;

    private final SousCompetenceRepository sousCompetenceRepository;
    private final CompetenceRepository competenceRepository;
    private final EnseignantCompetenceRepository enseignantCompetenceRepository;
    private final NiveauSavoirRequisRepository niveauRepo;
    private final SavoirRepository savoirRepository;
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
        return sousCompetenceRepository.findByCompetenceIdAndParentIsNull(competenceId).stream()
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

        validateCodePrefix(request.getCode(), competence.getCode());
        validateUniqueCode(request.getCode(), null);

        SousCompetence sousCompetence = SousCompetence.builder()
                .code(request.getCode())
                .nom(request.getNom())
                .description(request.getDescription())
                .competence(competence)
                .parent(null)
                .niveau(1)
                .build();

        SousCompetence saved = sousCompetenceRepository.save(sousCompetence);
        log.info("Sous-compétence créée: {} dans compétence {}", saved.getNom(), competence.getNom());
        return competenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    public SousCompetenceDTO createSousCompetenceEnfant(Long parentId, SousCompetenceRequest request) {
        SousCompetence parent = sousCompetenceRepository.findById(parentId)
                .orElseThrow(() -> new EntityNotFoundException("Sous-compétence parente non trouvée avec l'id: " + parentId));

        validateCodePrefix(request.getCode(), parent.getCode());

        if (parent.getSavoirs() != null && !parent.getSavoirs().isEmpty()) {
            throw new IllegalArgumentException("Impossible d'ajouter un enfant: cette sous-compétence contient déjà des savoirs.");
        }

        int childLevel = (parent.getNiveau() == null ? 1 : parent.getNiveau()) + 1;
        if (childLevel > MAX_NIVEAU) {
            throw new IllegalArgumentException("Profondeur maximale atteinte: niveau " + MAX_NIVEAU + ".");
        }

        validateUniqueCode(request.getCode(), null);

        SousCompetence child = SousCompetence.builder()
                .code(request.getCode())
                .nom(request.getNom())
                .description(request.getDescription())
                .competence(parent.getCompetence())
                .parent(parent)
                .niveau(childLevel)
                .build();

        SousCompetence saved = sousCompetenceRepository.save(child);
        log.info("Sous-compétence enfant créée: {} sous parent {}", saved.getNom(), parent.getNom());
        return competenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    public SousCompetenceDTO updateSousCompetence(Long id, SousCompetenceRequest request) {
        SousCompetence existing = sousCompetenceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Sous-compétence non trouvée avec l'id: " + id));

        validateUniqueCode(request.getCode(), id);

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
        SousCompetence existing = sousCompetenceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Sous-compétence non trouvée avec l'id: " + id));

        List<Long> subtreeIds = collectSubtreeIds(id);

        for (Long scId : subtreeIds) {
            niveauRepo.deleteBySousCompetenceId(scId);
        }

        List<Long> savoirIds = new ArrayList<>();
        for (Long scId : subtreeIds) {
            savoirIds.addAll(savoirRepository.findIdsBySousCompetenceId(scId));
        }

        if (!savoirIds.isEmpty()) {
            niveauRepo.deleteBySavoirIdIn(savoirIds);
            enseignantCompetenceRepository.deleteBySavoirIdIn(savoirIds);
        }

        sousCompetenceRepository.deleteById(id);
        log.info("Sous-compétence supprimée: {} ({} noeud(s) dans le sous-arbre)", existing.getNom(), subtreeIds.size());
    }

    private void validateUniqueCode(String code, Long currentId) {
        sousCompetenceRepository.findByCode(code)
                .ifPresent(existing -> {
                    if (currentId == null || !existing.getId().equals(currentId)) {
                        throw new IllegalArgumentException("Une sous-compétence avec le code '" + code + "' existe déjà");
                    }
                });
    }

    private void validateCodePrefix(String code, String parentCode) {
        String expectedPrefix = parentCode + ".";

        if (code == null || !code.startsWith(expectedPrefix)) {
            throw new BusinessException("Le code doit commencer par '" + expectedPrefix + "' (reçu : '" + code + "')");
        }

        if (code.length() > 100) {
            throw new BusinessException("Le code ne doit pas dépasser 100 caractères");
        }

        String suffix = code.substring(expectedPrefix.length());
        if (suffix.trim().isEmpty()) {
            throw new BusinessException("Le code ne peut pas se terminer par un point.");
        }

        if (!suffix.matches("^[A-Z0-9_]+$")) {
            throw new BusinessException("Le suffixe du code doit contenir uniquement des majuscules, chiffres et _");
        }
    }

    private List<Long> collectSubtreeIds(Long rootId) {
        List<Long> ids = new ArrayList<>();
        Deque<Long> stack = new ArrayDeque<>();
        stack.push(rootId);

        while (!stack.isEmpty()) {
            Long current = stack.pop();
            ids.add(current);
            for (SousCompetence child : sousCompetenceRepository.findByParentId(current)) {
                stack.push(child.getId());
            }
        }

        return ids;
    }
}
