package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.EvaluationFormateurDTO;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.PresenceRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Classe helper pour extraire la logique de gestion des présences et évaluations
 * et réduire la complexité cognitive de FormationWorkflowService.
 */
@Component
@RequiredArgsConstructor
public class FormationWorkflowServicePresenceHelper {

    private final PresenceRepository presenceRepository;
    private final EnseignantRepository enseignantRepository;
    private final SeanceFormationRepository seanceFormationRepository;

    /**
     * Synchronise les présences pour une liste de séances
     */
    public void syncPresencesForSeances(List<SeanceFormation> seances, List<String> partIds) {
        if (partIds == null) return;

        for (SeanceFormation sf : seances) {
            if (sf.getIdSeance() != null) {
                syncPresencesForSeance(sf, partIds);
            }
        }
    }

    /**
     * Synchronise les présences pour une séance spécifique
     */
    private void syncPresencesForSeance(SeanceFormation sf, List<String> newEnsIds) {
        List<Presence> oldList = presenceRepository.findBySeanceFormation_IdSeance(sf.getIdSeance());
        Set<String> newSet = new HashSet<>(newEnsIds);

        // Supprimer les présences des enseignants qui ne sont plus dans la liste
        for (Presence p : oldList) {
            String ensId = p.getEnseignant().getId();
            if (!newSet.contains(ensId)) {
                presenceRepository.delete(p);
            }
        }

        // Ajouter les nouvelles présences
        for (String id : newSet) {
            boolean exists = oldList.stream()
                    .anyMatch(p -> p.getEnseignant().getId().equals(id));
            if (!exists) {
                addPresenceForEnseignant(sf, id);
            }
        }
    }

    /**
     * Ajoute une présence pour un enseignant
     */
    private void addPresenceForEnseignant(SeanceFormation sf, String enseignantId) {
        Enseignant ens = enseignantRepository.findById(enseignantId)
                .orElseThrow(() -> new IllegalArgumentException("Enseignant introuvable : " + enseignantId));
        Presence p = new Presence();
        p.setSeanceFormation(sf);
        p.setEnseignant(ens);
        p.setPresent(false);
        p.setCommentaire("Presence a valider");
        presenceRepository.save(p);
    }

    /**
     * Crée les DTOs d'évaluation pour tous les enseignants
     */
    public List<EvaluationFormateurDTO> createEvaluationDTOs(
            List<SeanceFormation> seances,
            Formation formation) {

        Set<String> seen = new HashSet<>();
        List<EvaluationFormateurDTO> evaluationDTOs = new ArrayList<>();

        for (SeanceFormation sf : seances) {
            addEvaluationDTOsForSeance(sf, formation, seen, evaluationDTOs);
        }

        return evaluationDTOs;
    }

    /**
     * Ajoute les DTOs d'évaluation pour une séance
     */
    private void addEvaluationDTOsForSeance(
            SeanceFormation sf,
            Formation formation,
            Set<String> seen,
            List<EvaluationFormateurDTO> evaluationDTOs) {

        // Ajouter les participants
        if (sf.getParticipants() != null) {
            for (Enseignant pt : sf.getParticipants()) {
                String key = pt.getId() + "-" + formation.getIdFormation();
                if (!seen.contains(key)) {
                    seen.add(key);
                    evaluationDTOs.add(createEvaluationDTO(pt, formation.getIdFormation()));
                }
            }
        }

        // Ajouter les animateurs
        if (sf.getAnimateurs() != null) {
            for (Enseignant anim : sf.getAnimateurs()) {
                String key = anim.getId() + "-" + formation.getIdFormation();
                if (!seen.contains(key)) {
                    seen.add(key);
                    evaluationDTOs.add(createEvaluationDTO(anim, formation.getIdFormation()));
                }
            }
        }
    }

    /**
     * Crée un DTO d'évaluation
     */
    private EvaluationFormateurDTO createEvaluationDTO(Enseignant enseignant, Long formationId) {
        EvaluationFormateurDTO dto = new EvaluationFormateurDTO();
        dto.setEnseignantId(enseignant.getId());
        dto.setFormationId(formationId);
        dto.setNote(0f);
        dto.setSatisfaisant(false);
        dto.setCommentaire("N/A");
        return dto;
    }
}
