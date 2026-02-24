package tn.esprit.d2f.competence.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.d2f.competence.dto.NiveauSavoirRequisDTO;
import tn.esprit.d2f.competence.dto.NiveauSavoirRequisRequest;
import tn.esprit.d2f.competence.entity.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.NiveauSavoirRequisRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;
import tn.esprit.d2f.competence.repository.SousCompetenceRepository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class NiveauDefinitionServiceImpl implements INiveauDefinitionService {

    @Autowired
    private NiveauSavoirRequisRepository niveauRepo;

    @Autowired
    private CompetenceRepository competenceRepository;

    @Autowired
    private SousCompetenceRepository sousCompetenceRepository;

    @Autowired
    private SavoirRepository savoirRepository;

    @Override
    @Transactional(readOnly = true)
    public Map<String, List<NiveauSavoirRequisDTO>> getNiveauxByCompetence(Long competenceId) {
        List<NiveauSavoirRequis> all = niveauRepo.findByCompetenceId(competenceId);
        return groupByNiveau(all);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, List<NiveauSavoirRequisDTO>> getNiveauxBySousCompetence(Long sousCompetenceId) {
        List<NiveauSavoirRequis> all = niveauRepo.findBySousCompetenceId(sousCompetenceId);
        return groupByNiveau(all);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NiveauSavoirRequisDTO> getSavoirsRequisByCompetenceAndNiveau(Long competenceId, NiveauMaitrise niveau) {
        return niveauRepo.findByCompetenceIdAndNiveau(competenceId, niveau).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<NiveauSavoirRequisDTO> getSavoirsRequisBySousCompetenceAndNiveau(Long sousCompetenceId, NiveauMaitrise niveau) {
        return niveauRepo.findBySousCompetenceIdAndNiveau(sousCompetenceId, niveau).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public NiveauSavoirRequisDTO addSavoirRequis(NiveauSavoirRequisRequest request) {
        if (request.getCompetenceId() == null && request.getSousCompetenceId() == null) {
            throw new IllegalArgumentException("Il faut spécifier soit une compétence, soit une sous-compétence");
        }

        Savoir savoir = savoirRepository.findById(request.getSavoirId())
                .orElseThrow(() -> new EntityNotFoundException("Savoir non trouvé avec l'id: " + request.getSavoirId()));

        NiveauSavoirRequis nsr = NiveauSavoirRequis.builder()
                .niveau(request.getNiveau())
                .savoir(savoir)
                .description(request.getDescription())
                .build();

        if (request.getCompetenceId() != null) {
            Competence competence = competenceRepository.findById(request.getCompetenceId())
                    .orElseThrow(() -> new EntityNotFoundException("Compétence non trouvée avec l'id: " + request.getCompetenceId()));
            if (niveauRepo.existsByCompetenceIdAndNiveauAndSavoirId(
                    request.getCompetenceId(), request.getNiveau(), request.getSavoirId())) {
                throw new IllegalArgumentException("Ce savoir est déjà associé à ce niveau pour cette compétence");
            }
            nsr.setCompetence(competence);
        } else {
            SousCompetence sc = sousCompetenceRepository.findById(request.getSousCompetenceId())
                    .orElseThrow(() -> new EntityNotFoundException("Sous-compétence non trouvée avec l'id: " + request.getSousCompetenceId()));
            if (niveauRepo.existsBySousCompetenceIdAndNiveauAndSavoirId(
                    request.getSousCompetenceId(), request.getNiveau(), request.getSavoirId())) {
                throw new IllegalArgumentException("Ce savoir est déjà associé à ce niveau pour cette sous-compétence");
            }
            nsr.setSousCompetence(sc);
        }

        NiveauSavoirRequis saved = niveauRepo.save(nsr);
        log.info("Savoir requis ajouté: niveau={}, savoir={}", saved.getNiveau(), savoir.getNom());
        return toDTO(saved);
    }

    @Override
    @Transactional
    public void removeSavoirRequis(Long id) {
        if (!niveauRepo.existsById(id)) {
            throw new EntityNotFoundException("NiveauSavoirRequis non trouvé avec l'id: " + id);
        }
        niveauRepo.deleteById(id);
        log.info("Savoir requis supprimé: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NiveauSavoirRequisDTO> getAll() {
        return niveauRepo.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Map<String, List<NiveauSavoirRequisDTO>> groupByNiveau(List<NiveauSavoirRequis> list) {
        Map<String, List<NiveauSavoirRequisDTO>> result = new LinkedHashMap<>();
        for (NiveauMaitrise niveau : NiveauMaitrise.values()) {
            List<NiveauSavoirRequisDTO> dtos = list.stream()
                    .filter(n -> n.getNiveau() == niveau)
                    .map(this::toDTO)
                    .collect(Collectors.toList());
            result.put(niveau.name(), dtos);
        }
        return result;
    }

    private NiveauSavoirRequisDTO toDTO(NiveauSavoirRequis nsr) {
        return NiveauSavoirRequisDTO.builder()
                .id(nsr.getId())
                .competenceId(nsr.getCompetence() != null ? nsr.getCompetence().getId() : null)
                .competenceNom(nsr.getCompetence() != null ? nsr.getCompetence().getNom() : null)
                .sousCompetenceId(nsr.getSousCompetence() != null ? nsr.getSousCompetence().getId() : null)
                .sousCompetenceNom(nsr.getSousCompetence() != null ? nsr.getSousCompetence().getNom() : null)
                .niveau(nsr.getNiveau())
                .savoirId(nsr.getSavoir() != null ? nsr.getSavoir().getId() : null)
                .savoirNom(nsr.getSavoir() != null ? nsr.getSavoir().getNom() : null)
                .savoirCode(nsr.getSavoir() != null ? nsr.getSavoir().getCode() : null)
                .description(nsr.getDescription())
                .build();
    }
}
