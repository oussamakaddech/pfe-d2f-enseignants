package esprit.pfe.serviceevaluation.services;

import esprit.pfe.serviceevaluation.dto.EvaluationGlobaleDTO;
import esprit.pfe.serviceevaluation.entities.EvaluationGlobale;
import esprit.pfe.serviceevaluation.repositories.EvaluationGlobaleRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EvaluationGlobaleService {

    private static final String MSG_NOT_FOUND = "Évaluation globale non trouvée avec l'id : ";

    private final EvaluationGlobaleRepository evaluationGlobaleRepository;

    private EvaluationGlobaleDTO mapToDto(EvaluationGlobale entity) {
        EvaluationGlobaleDTO dto = new EvaluationGlobaleDTO();
        dto.setIdEvalGlobale(entity.getIdEvalGlobale());
        dto.setFormationId(entity.getFormationId());
        dto.setEnseignantId(entity.getEnseignantId());
        dto.setCommentaireGeneral(entity.getCommentaireGeneral());
        dto.setDateEvaluation(entity.getDateEvaluation());
        dto.setNoteGlobale(entity.getNoteGlobale());
        dto.setRecommandation(entity.getRecommandation());
        return dto;
    }

    private EvaluationGlobale mapToEntity(EvaluationGlobaleDTO dto) {
        EvaluationGlobale entity = new EvaluationGlobale();
        entity.setIdEvalGlobale(dto.getIdEvalGlobale());
        entity.setFormationId(dto.getFormationId());
        entity.setEnseignantId(dto.getEnseignantId());
        entity.setCommentaireGeneral(dto.getCommentaireGeneral());
        entity.setDateEvaluation(dto.getDateEvaluation());
        entity.setNoteGlobale(dto.getNoteGlobale());
        entity.setRecommandation(dto.getRecommandation());
        return entity;
    }

    public EvaluationGlobaleDTO createEvaluationGlobale(EvaluationGlobaleDTO dto) {
        if (evaluationGlobaleRepository.existsByFormationId(dto.getFormationId())) {
            throw new IllegalStateException("Une évaluation globale existe déjà pour la formation " + dto.getFormationId());
        }
        EvaluationGlobale entity = mapToEntity(dto);
        return mapToDto(evaluationGlobaleRepository.save(entity));
    }

    public EvaluationGlobaleDTO updateEvaluationGlobale(Long id, EvaluationGlobaleDTO dto) {
        EvaluationGlobale existing = evaluationGlobaleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(MSG_NOT_FOUND + id));
        existing.setCommentaireGeneral(dto.getCommentaireGeneral());
        existing.setEnseignantId(dto.getEnseignantId());
        existing.setDateEvaluation(dto.getDateEvaluation());
        existing.setNoteGlobale(dto.getNoteGlobale());
        existing.setRecommandation(dto.getRecommandation());
        return mapToDto(evaluationGlobaleRepository.save(existing));
    }

    public void deleteEvaluationGlobale(Long id) {
        EvaluationGlobale entity = evaluationGlobaleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(MSG_NOT_FOUND + id));
        evaluationGlobaleRepository.delete(entity);
    }

    public EvaluationGlobaleDTO getEvaluationGlobaleById(Long id) {
        return evaluationGlobaleRepository.findById(id)
                .map(this::mapToDto)
                .orElseThrow(() -> new EntityNotFoundException(MSG_NOT_FOUND + id));
    }

    public EvaluationGlobaleDTO getEvaluationGlobaleByFormationId(Long formationId) {
        return evaluationGlobaleRepository.findByFormationId(formationId)
                .map(this::mapToDto)
                .orElseThrow(() -> new EntityNotFoundException("Évaluation globale non trouvée pour la formation : " + formationId));
    }

    public Page<EvaluationGlobaleDTO> getAllEvaluationGlobales(Pageable pageable) {
        return evaluationGlobaleRepository.findAll(pageable)
                .map(this::mapToDto);
    }
}