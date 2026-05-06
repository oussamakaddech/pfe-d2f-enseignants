package esprit.pfe.serviceevaluation.Services;

import esprit.pfe.serviceevaluation.DTO.EvaluationGlobaleDTO;
import esprit.pfe.serviceevaluation.Entities.EvaluationGlobale;
import esprit.pfe.serviceevaluation.Repositories.EvaluationGlobaleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class EvaluationGlobaleService {

    @Autowired
    private EvaluationGlobaleRepository evaluationGlobaleRepository;

    private EvaluationGlobaleDTO mapToDto(EvaluationGlobale entity) {
        EvaluationGlobaleDTO dto = new EvaluationGlobaleDTO();
        dto.setIdEvalGlobale(entity.getIdEvalGlobale());
        dto.setFormationId(entity.getFormationId());
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
        entity.setCommentaireGeneral(dto.getCommentaireGeneral());
        entity.setDateEvaluation(dto.getDateEvaluation());
        entity.setNoteGlobale(dto.getNoteGlobale());
        entity.setRecommandation(dto.getRecommandation());
        return entity;
    }

    public EvaluationGlobaleDTO createEvaluationGlobale(EvaluationGlobaleDTO dto) {
        if (evaluationGlobaleRepository.existsByFormationId(dto.getFormationId())) {
            throw new RuntimeException("Une évaluation globale existe déjà pour la formation " + dto.getFormationId());
        }
        EvaluationGlobale entity = mapToEntity(dto);
        return mapToDto(evaluationGlobaleRepository.save(entity));
    }

    public EvaluationGlobaleDTO updateEvaluationGlobale(Long id, EvaluationGlobaleDTO dto) {
        EvaluationGlobale existing = evaluationGlobaleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Évaluation globale non trouvée avec l'id : " + id));
        existing.setCommentaireGeneral(dto.getCommentaireGeneral());
        existing.setDateEvaluation(dto.getDateEvaluation());
        existing.setNoteGlobale(dto.getNoteGlobale());
        existing.setRecommandation(dto.getRecommandation());
        return mapToDto(evaluationGlobaleRepository.save(existing));
    }

    public void deleteEvaluationGlobale(Long id) {
        evaluationGlobaleRepository.deleteById(id);
    }

    public EvaluationGlobaleDTO getEvaluationGlobaleById(Long id) {
        return evaluationGlobaleRepository.findById(id)
                .map(this::mapToDto)
                .orElseThrow(() -> new RuntimeException("Évaluation globale non trouvée avec l'id : " + id));
    }

    public EvaluationGlobaleDTO getEvaluationGlobaleByFormationId(Long formationId) {
        return evaluationGlobaleRepository.findByFormationId(formationId)
                .map(this::mapToDto)
                .orElseThrow(() -> new RuntimeException("Évaluation globale non trouvée pour la formation : " + formationId));
    }

    public List<EvaluationGlobaleDTO> getAllEvaluationGlobales() {
        return evaluationGlobaleRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }
}