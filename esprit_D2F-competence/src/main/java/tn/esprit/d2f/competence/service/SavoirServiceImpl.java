package tn.esprit.d2f.competence.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.esprit.d2f.competence.dto.SavoirDTO;
import tn.esprit.d2f.competence.dto.SavoirRequest;
import tn.esprit.d2f.competence.entity.Savoir;
import tn.esprit.d2f.competence.entity.SousCompetence;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;
import tn.esprit.d2f.competence.repository.SousCompetenceRepository;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SavoirServiceImpl implements ISavoirService {

    private final SavoirRepository savoirRepository;
    private final SousCompetenceRepository sousCompetenceRepository;
    private final CompetenceRepository competenceRepository;
    private final EnseignantCompetenceRepository enseignantCompetenceRepository;
    private final CompetenceMapper competenceMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<SavoirDTO> getAllSavoirs(Pageable pageable) {
        return savoirRepository.findAll(pageable)
                .map(competenceMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SavoirDTO> getSavoirsBySousCompetence(Long sousCompetenceId) {
        return savoirRepository.findBySousCompetenceId(sousCompetenceId).stream()
                .map(competenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SavoirDTO> getSavoirsByCompetence(Long competenceId) {
        return savoirRepository.findByCompetenceId(competenceId).stream()
                .map(competenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SavoirDTO> getSavoirsByType(TypeSavoir type) {
        return savoirRepository.findByType(type).stream()
                .map(competenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public SavoirDTO getSavoirById(Long id) {
        Savoir s = savoirRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Savoir non trouvé avec l'id: " + id));
        return competenceMapper.toDTO(s);
    }

    @Override
    @Transactional
    public SavoirDTO createSavoir(Long sousCompetenceId, SavoirRequest request) {
        SousCompetence sc = sousCompetenceRepository.findById(sousCompetenceId)
                .orElseThrow(() -> new EntityNotFoundException("Sous-compétence non trouvée avec l'id: " + sousCompetenceId));
        if (savoirRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Un savoir avec le code '" + request.getCode() + "' existe déjà");
        }
        Savoir savoir = Savoir.builder()
                .code(request.getCode())
                .nom(request.getNom())
                .description(request.getDescription())
                .type(request.getType())
                .niveau(request.getNiveau() != null ? request.getNiveau() : NiveauMaitrise.N2_ELEMENTAIRE)
                .sousCompetence(sc)
                .build();
        Savoir saved = savoirRepository.save(savoir);
        log.info("Savoir créé: {} ({})", saved.getNom(), saved.getType());
        return competenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    public SavoirDTO createSavoirForCompetence(Long competenceId, SavoirRequest request) {
        Competence competence = competenceRepository.findById(competenceId)
                .orElseThrow(() -> new EntityNotFoundException("Compétence non trouvée avec l'id: " + competenceId));
        if (savoirRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Un savoir avec le code '" + request.getCode() + "' existe déjà");
        }
        Savoir savoir = Savoir.builder()
                .code(request.getCode())
                .nom(request.getNom())
                .description(request.getDescription())
                .type(request.getType())
                .niveau(request.getNiveau() != null ? request.getNiveau() : NiveauMaitrise.N2_ELEMENTAIRE)
                .competence(competence)
                .build();
        Savoir saved = savoirRepository.save(savoir);
        log.info("Savoir créé pour compétence: {} ({})", saved.getNom(), saved.getType());
        return competenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    public SavoirDTO updateSavoir(Long id, SavoirRequest request) {
        Savoir existing = savoirRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Savoir non trouvé avec l'id: " + id));
        existing.setCode(request.getCode());
        existing.setNom(request.getNom());
        existing.setDescription(request.getDescription());
        existing.setType(request.getType());
        if (request.getNiveau() != null) {
            existing.setNiveau(request.getNiveau());
        }
        Savoir saved = savoirRepository.save(existing);
        log.info("Savoir mis à jour: {}", saved.getId());
        return competenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    public void deleteSavoir(Long id) {
        if (!savoirRepository.existsById(id)) {
            throw new EntityNotFoundException("Savoir non trouvé avec l'id: " + id);
        }
        // Supprimer les affectations enseignant-compétence liées à ce savoir
        enseignantCompetenceRepository.deleteBySavoirId(id);
        savoirRepository.deleteById(id);
        log.info("Savoir supprimé: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SavoirDTO> searchSavoirs(String keyword) {
        return savoirRepository.searchByKeyword(keyword).stream()
                .map(competenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SavoirDTO> searchSavoirs(String keyword, Pageable pageable) {
        return savoirRepository.searchByKeyword(keyword, pageable)
                .map(competenceMapper::toDTO);
    }
}
