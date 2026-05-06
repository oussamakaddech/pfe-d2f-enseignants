package esprit.pfe.serviceevaluation.Services;


import esprit.pfe.serviceevaluation.DTO.EvaluationEnseignantDTO;
import esprit.pfe.serviceevaluation.DTO.EvaluationFormateurDTO;
import esprit.pfe.serviceevaluation.Entities.EvaluationFormateur;
import esprit.pfe.serviceevaluation.Repositories.EvaluationFormateurRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class EvaluationFormateurService {

    @Autowired
    private EvaluationFormateurRepository evaluationRepository;



    // Mapper helper
    private EvaluationFormateurDTO mapToDto(EvaluationFormateur entity) {
        EvaluationFormateurDTO dto = new EvaluationFormateurDTO();
        dto.setIdEvalParticipant(entity.getIdEvalParticipant());
        dto.setEnseignantId(entity.getEnseignantId());
        dto.setFormationId(entity.getFormationId());
        dto.setNote(entity.getNote());
        dto.setSatisfaisant(entity.isSatisfaisant());
        dto.setCommentaire(entity.getCommentaire());
        return dto;
    }

    private EvaluationFormateur mapToEntity(EvaluationFormateurDTO dto) {
        EvaluationFormateur entity = new EvaluationFormateur();
        entity.setIdEvalParticipant(dto.getIdEvalParticipant());
        entity.setEnseignantId(dto.getEnseignantId());
        entity.setFormationId(dto.getFormationId());
        entity.setNote(dto.getNote());
        entity.setSatisfaisant(dto.isSatisfaisant());
        entity.setCommentaire(dto.getCommentaire());
        return entity;
    }

    // CREATE
    public EvaluationFormateurDTO ajouterEvalParticipant(EvaluationFormateurDTO dto) {
        EvaluationFormateur evaluation = mapToEntity(dto);
        return mapToDto(evaluationRepository.save(evaluation));
    }

    // UPDATE
    public EvaluationFormateurDTO modifierEvalParticipant(Long id, EvaluationFormateurDTO updatedDto) {
        EvaluationFormateur existingEval = evaluationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Evaluation non trouvée avec l'id : " + id));

        existingEval.setNote(updatedDto.getNote());
        existingEval.setSatisfaisant(updatedDto.isSatisfaisant());
        existingEval.setCommentaire(updatedDto.getCommentaire());
        existingEval.setEnseignantId(updatedDto.getEnseignantId());
        existingEval.setFormationId(updatedDto.getFormationId());

        return mapToDto(evaluationRepository.save(existingEval));
    }

    // DELETE
    public void supprimerEvalParticipant(Long id) {
        evaluationRepository.deleteById(id);
    }

    // READ
    public EvaluationFormateur consulterEvalParticipant(Long id) {
        return evaluationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Evaluation non trouvée avec l'id : " + id));
    }

    public EvaluationFormateurDTO getEvaluationDto(Long id) {
        return mapToDto(consulterEvalParticipant(id));
    }

    // LIST
    public List<EvaluationFormateurDTO> listAllEvaluationsDto() {
        return evaluationRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }


    // Exemple de logique "validerCompetences"
    public void validerCompetences(Long evalId) {
        EvaluationFormateur eval = consulterEvalParticipant(evalId);
        if(eval.getNote() >= 10) {
            eval.setSatisfaisant(true);
            evaluationRepository.save(eval);
        }
    }


    public void createEvaluationsBulk(List<EvaluationFormateurDTO> dtos) {
        List<EvaluationFormateur> entities = new ArrayList<>();
        for (EvaluationFormateurDTO dto : dtos) {
            EvaluationFormateur entity = new EvaluationFormateur();
            entity.setEnseignantId(dto.getEnseignantId());
            entity.setFormationId(dto.getFormationId());
            entity.setNote(dto.getNote());
            entity.setSatisfaisant(dto.isSatisfaisant());
            entity.setCommentaire(dto.getCommentaire());
            entities.add(entity);
        }
        evaluationRepository.saveAll(entities);
    }
    public List<EvaluationEnseignantDTO> listEvaluationsEnrichedByFormation(Long formationId) {
        // 1) Récupérer toutes les évaluations de cette formation
        List<EvaluationFormateur> evaluations = evaluationRepository.findByFormationId(formationId);
        List<EvaluationEnseignantDTO> results = new ArrayList<>();

        // 2) Pour chaque évaluation
        for (EvaluationFormateur eval : evaluations) {
            // Appel Feign pour récupérer l'enseignant
            // EnseignantDTO ensDTO = null;


            // Construire le DTO enrichi
            EvaluationEnseignantDTO dto = new EvaluationEnseignantDTO();
            dto.setIdEvalParticipant(eval.getIdEvalParticipant());
            dto.setNote(eval.getNote());
            dto.setSatisfaisant(eval.isSatisfaisant());
            dto.setCommentaire(eval.getCommentaire());
            dto.setFormationId(eval.getFormationId());
            dto.setEnseignantId(eval.getEnseignantId());

            /*
            // Si l’enseignant a été trouvé, remplir les champs
            if (ensDTO != null) {
                dto.setNom(ensDTO.getNom());
                dto.setPrenom(ensDTO.getPrenom());
                dto.setMail(ensDTO.getMail());
                dto.setType(ensDTO.getType());
                dto.setDeptLibelle(ensDTO.getDeptLibelle());
                dto.setUpLibelle(ensDTO.getUpLibelle());
            }
            */
            results.add(dto);
        }

        return results;
    }

    @Transactional
    public void updateEvaluationsBulkByFormation(Long formationId, List<EvaluationFormateurDTO> dtos) {
        // 1) Charger toutes les évaluations existantes de la formation
        List<EvaluationFormateur> existing = evaluationRepository.findByFormationId(formationId);

        // 2) Indexer par enseignantId
        Map<String, EvaluationFormateur> byEnsId = existing.stream()
                .collect(Collectors.toMap(EvaluationFormateur::getEnseignantId, Function.identity()));

        // 3) Construire l’ensemble des enseignantIds reçus
        Set<String> newEnsIds = dtos.stream()
                .map(EvaluationFormateurDTO::getEnseignantId)
                .collect(Collectors.toSet());

        // 4) Supprimer celles qui ne sont plus dans newEnsIds
        existing.stream()
                .filter(ev -> !newEnsIds.contains(ev.getEnseignantId()))
                .forEach(ev -> evaluationRepository.delete(ev));

        // 5) Parcourir la nouvelle liste pour créer ou mettre à jour
        for (EvaluationFormateurDTO dto : dtos) {
            EvaluationFormateur ev = byEnsId.get(dto.getEnseignantId());
            if (ev != null) {
                // Mise à jour
                ev.setNote(dto.getNote());
                ev.setSatisfaisant(dto.isSatisfaisant());
                ev.setCommentaire(dto.getCommentaire());
            } else {
                // Création
                ev = new EvaluationFormateur();
                ev.setFormationId(formationId);
                ev.setEnseignantId(dto.getEnseignantId());
                ev.setNote(dto.getNote());
                ev.setSatisfaisant(dto.isSatisfaisant());
                ev.setCommentaire(dto.getCommentaire());
            }
            evaluationRepository.save(ev);
        }
    }


}
