package esprit.pfe.serviceevaluation.Services;

import esprit.pfe.serviceevaluation.Entities.EvaluationGlobale;
import esprit.pfe.serviceevaluation.Repositories.EvaluationGlobaleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EvaluationGlobaleService {

    @Autowired
    private EvaluationGlobaleRepository evaluationGlobaleRepository;

    public EvaluationGlobale createEvaluationGlobale(EvaluationGlobale evaluation) {
        // Check for duplicate - one global evaluation per formation
        if (evaluationGlobaleRepository.existsByFormationId(evaluation.getFormationId())) {
            throw new RuntimeException("Une évaluation globale existe déjà pour la formation " + evaluation.getFormationId());
        }
        return evaluationGlobaleRepository.save(evaluation);
    }

    public EvaluationGlobale updateEvaluationGlobale(Long id, EvaluationGlobale evaluation) {
        EvaluationGlobale existing = evaluationGlobaleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Évaluation globale non trouvée avec l'id : " + id));
        existing.setCommentaireGeneral(evaluation.getCommentaireGeneral());
        existing.setDateEvaluation(evaluation.getDateEvaluation());
        existing.setNoteGlobale(evaluation.getNoteGlobale());
        existing.setRecommandation(evaluation.getRecommandation());
        return evaluationGlobaleRepository.save(existing);
    }

    public void deleteEvaluationGlobale(Long id) {
        evaluationGlobaleRepository.deleteById(id);
    }

    public EvaluationGlobale getEvaluationGlobaleById(Long id) {
        return evaluationGlobaleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Évaluation globale non trouvée avec l'id : " + id));
    }

    public EvaluationGlobale getEvaluationGlobaleByFormationId(Long formationId) {
        return evaluationGlobaleRepository.findByFormationId(formationId)
                .orElseThrow(() -> new RuntimeException("Évaluation globale non trouvée pour la formation : " + formationId));
    }

    public List<EvaluationGlobale> getAllEvaluationGlobales() {
        return evaluationGlobaleRepository.findAll();
    }
}