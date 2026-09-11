package esprit.pfe.serviceevaluation.services;


import esprit.pfe.serviceevaluation.dto.EvaluationEnseignantDTO;
import esprit.pfe.serviceevaluation.dto.EvaluationFormateurDTO;
import esprit.pfe.serviceevaluation.entities.EvaluationFormateur;
import esprit.pfe.serviceevaluation.repositories.EvaluationFormateurRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EvaluationFormateurService {

    private final EvaluationFormateurRepository evaluationRepository;
    private final esprit.pfe.serviceevaluation.client.FormationClient formationClient;
    private final esprit.pfe.serviceevaluation.client.AuthClient authClient;

    private void verifierExistence(String enseignantId, Long formationId) {
        if (Boolean.FALSE.equals(formationClient.getFormation(formationId))) {
            throw new esprit.pfe.serviceevaluation.exception.ResourceNotFoundException("Formation introuvable");
        }
        if (!authClient.enseignantExists(enseignantId)) {
            throw new esprit.pfe.serviceevaluation.exception.ResourceNotFoundException("Enseignant introuvable");
        }
    }

    // Mapper helper
    private EvaluationFormateurDTO mapToDto(EvaluationFormateur entity) {
        EvaluationFormateurDTO dto = new EvaluationFormateurDTO();
        dto.setIdEvalParticipant(entity.getIdEvalParticipant());
        dto.setEnseignantId(entity.getEnseignantId());
        dto.setFormationId(entity.getFormationId());
        dto.setNote(entity.getNote());
        dto.setSatisfaisant(entity.isSatisfaisant());
        dto.setCommentaire(entity.getCommentaire());
        dto.setMaitriseSujet(entity.getMaitriseSujet());
        dto.setClarte(entity.getClarte());
        dto.setPedagogie(entity.getPedagogie());
        dto.setInteraction(entity.getInteraction());
        dto.setGestionTemps(entity.getGestionTemps());
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
        entity.setMaitriseSujet(dto.getMaitriseSujet());
        entity.setClarte(dto.getClarte());
        entity.setPedagogie(dto.getPedagogie());
        entity.setInteraction(dto.getInteraction());
        entity.setGestionTemps(dto.getGestionTemps());
        return entity;
    }

    // CREATE
    public EvaluationFormateurDTO ajouterEvalParticipant(EvaluationFormateurDTO dto) {
        verifierExistence(dto.getEnseignantId(), dto.getFormationId());
        EvaluationFormateur evaluation = mapToEntity(dto);
        return mapToDto(evaluationRepository.save(evaluation));
    }

    // UPDATE
    public EvaluationFormateurDTO modifierEvalParticipant(Long id, EvaluationFormateurDTO updatedDto) {
        verifierExistence(updatedDto.getEnseignantId(), updatedDto.getFormationId());
        EvaluationFormateur existingEval = evaluationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Evaluation non trouvée avec l'id : " + id));

        existingEval.setNote(updatedDto.getNote());
        existingEval.setSatisfaisant(updatedDto.isSatisfaisant());
        existingEval.setCommentaire(updatedDto.getCommentaire());
        existingEval.setEnseignantId(updatedDto.getEnseignantId());
        existingEval.setFormationId(updatedDto.getFormationId());
        applyTrainerCriteria(existingEval, updatedDto);

        return mapToDto(evaluationRepository.save(existingEval));
    }

    /** Applique les critères structurés de l'évaluation du formateur. */
    private void applyTrainerCriteria(EvaluationFormateur entity, EvaluationFormateurDTO dto) {
        entity.setMaitriseSujet(dto.getMaitriseSujet());
        entity.setClarte(dto.getClarte());
        entity.setPedagogie(dto.getPedagogie());
        entity.setInteraction(dto.getInteraction());
        entity.setGestionTemps(dto.getGestionTemps());
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

    // LIST (paginé)
    public Page<EvaluationFormateurDTO> listAllEvaluationsDto(Pageable pageable) {
        return evaluationRepository.findAll(pageable)
                .map(this::mapToDto);
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
        validateBulkReferences(dtos);
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
            EvaluationEnseignantDTO dto = new EvaluationEnseignantDTO();
            dto.setIdEvalParticipant(eval.getIdEvalParticipant());
            dto.setNote(eval.getNote());
            dto.setSatisfaisant(eval.isSatisfaisant());
            dto.setCommentaire(eval.getCommentaire());
            dto.setFormationId(eval.getFormationId());
            dto.setEnseignantId(eval.getEnseignantId());
            results.add(dto);
        }

        return results;
    }

    public Page<EvaluationEnseignantDTO> listEvaluationsEnrichedByFormation(Long formationId, Pageable pageable) {
        List<EvaluationEnseignantDTO> all = listEvaluationsEnrichedByFormation(formationId);
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<EvaluationEnseignantDTO> content = start >= all.size()
                ? List.of()
                : all.subList(start, end);
        return new org.springframework.data.domain.PageImpl<>(content, pageable, all.size());
    }

    @Transactional
    public void updateEvaluationsBulkByFormation(Long formationId, List<EvaluationFormateurDTO> dtos) {
        validateBulkReferencesForFormation(formationId, dtos);
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
                .forEach(evaluationRepository::delete);

        // 5) Parcourir la nouvelle liste pour créer ou mettre à jour
        for (EvaluationFormateurDTO dto : dtos) {
            EvaluationFormateur ev = byEnsId.get(dto.getEnseignantId());
            if (ev != null) {
                // Mise à jour
                ev.setNote(dto.getNote());
                ev.setSatisfaisant(dto.isSatisfaisant());
                ev.setCommentaire(dto.getCommentaire());
                applyTrainerCriteria(ev, dto);
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

    private void validateBulkReferences(List<EvaluationFormateurDTO> dtos) {
        Set<Long> formationIds = new HashSet<>();
        Set<String> enseignantIds = new HashSet<>();
        for (EvaluationFormateurDTO dto : dtos) {
            if (dto == null || dto.getFormationId() == null || dto.getEnseignantId() == null
                    || dto.getEnseignantId().isBlank()) {
                throw new IllegalArgumentException("Chaque évaluation doit préciser une formation et un enseignant.");
            }
            formationIds.add(dto.getFormationId());
            enseignantIds.add(dto.getEnseignantId());
        }
        formationIds.forEach(formationId -> {
            if (Boolean.FALSE.equals(formationClient.getFormation(formationId))) {
                throw new esprit.pfe.serviceevaluation.exception.ResourceNotFoundException("Formation introuvable");
            }
        });
        enseignantIds.forEach(enseignantId -> {
            if (!authClient.enseignantExists(enseignantId)) {
                throw new esprit.pfe.serviceevaluation.exception.ResourceNotFoundException("Enseignant introuvable");
            }
        });
    }

    private void validateBulkReferencesForFormation(Long formationId, List<EvaluationFormateurDTO> dtos) {
        if (formationId == null) {
            throw new IllegalArgumentException("La formation est obligatoire.");
        }
        if (dtos.isEmpty()) {
            return;
        }
        if (Boolean.FALSE.equals(formationClient.getFormation(formationId))) {
            throw new esprit.pfe.serviceevaluation.exception.ResourceNotFoundException("Formation introuvable");
        }
        Set<String> enseignantIds = new HashSet<>();
        for (EvaluationFormateurDTO dto : dtos) {
            if (dto == null || dto.getEnseignantId() == null || dto.getEnseignantId().isBlank()) {
                throw new IllegalArgumentException("Chaque évaluation doit préciser un enseignant.");
            }
            enseignantIds.add(dto.getEnseignantId());
        }
        enseignantIds.forEach(enseignantId -> {
            if (!authClient.enseignantExists(enseignantId)) {
                throw new esprit.pfe.serviceevaluation.exception.ResourceNotFoundException("Enseignant introuvable");
            }
        });
    }


}
