package tn.esprit.d2f.competence.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tn.esprit.d2f.competence.dto.SavoirDTO;
import tn.esprit.d2f.competence.entity.Savoir;
import tn.esprit.d2f.competence.entity.SousCompetence;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;
import tn.esprit.d2f.competence.repository.SousCompetenceRepository;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class SavoirServiceImpl implements ISavoirService {

    @Autowired
    private SavoirRepository savoirRepository;

    @Autowired
    private SousCompetenceRepository sousCompetenceRepository;

    @Autowired
    private CompetenceRepository competenceRepository;

    @Autowired
    private EnseignantCompetenceRepository enseignantCompetenceRepository;

    @Override
    @Transactional(readOnly = true)
    public List<SavoirDTO> getAllSavoirs() {
        return savoirRepository.findAll().stream()
                .map(CompetenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SavoirDTO> getSavoirsBySousCompetence(Long sousCompetenceId) {
        return savoirRepository.findBySousCompetenceId(sousCompetenceId).stream()
                .map(CompetenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SavoirDTO> getSavoirsByCompetence(Long competenceId) {
        return savoirRepository.findByCompetenceId(competenceId).stream()
                .map(CompetenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SavoirDTO> getSavoirsByType(TypeSavoir type) {
        return savoirRepository.findByType(type).stream()
                .map(CompetenceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public SavoirDTO getSavoirById(Long id) {
        Savoir s = savoirRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Savoir non trouvé avec l'id: " + id));
        return CompetenceMapper.toDTO(s);
    }

    @Override
    @Transactional
    public SavoirDTO createSavoir(Long sousCompetenceId, Savoir savoir) {
        SousCompetence sc = sousCompetenceRepository.findById(sousCompetenceId)
                .orElseThrow(() -> new EntityNotFoundException("Sous-compétence non trouvée avec l'id: " + sousCompetenceId));
        if (savoirRepository.existsByCode(savoir.getCode())) {
            throw new IllegalArgumentException("Un savoir avec le code '" + savoir.getCode() + "' existe déjà");
        }
        savoir.setSousCompetence(sc);
        Savoir saved = savoirRepository.save(savoir);
        log.info("Savoir créé: {} ({})", saved.getNom(), saved.getType());
        return CompetenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    public SavoirDTO createSavoirForCompetence(Long competenceId, Savoir savoir) {
        Competence competence = competenceRepository.findById(competenceId)
                .orElseThrow(() -> new EntityNotFoundException("Compétence non trouvée avec l'id: " + competenceId));
        if (savoirRepository.existsByCode(savoir.getCode())) {
            throw new IllegalArgumentException("Un savoir avec le code '" + savoir.getCode() + "' existe déjà");
        }
        savoir.setCompetence(competence);
        Savoir saved = savoirRepository.save(savoir);
        log.info("Savoir créé pour compétence: {} ({})", saved.getNom(), saved.getType());
        return CompetenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    public SavoirDTO updateSavoir(Long id, Savoir savoir) {
        Savoir existing = savoirRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Savoir non trouvé avec l'id: " + id));
        existing.setCode(savoir.getCode());
        existing.setNom(savoir.getNom());
        existing.setDescription(savoir.getDescription());
        existing.setType(savoir.getType());
        if (savoir.getNiveau() != null) {
            existing.setNiveau(savoir.getNiveau());
        }
        Savoir saved = savoirRepository.save(existing);
        log.info("Savoir mis à jour: {}", saved.getId());
        return CompetenceMapper.toDTO(saved);
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
                .map(CompetenceMapper::toDTO)
                .collect(Collectors.toList());
    }
}
