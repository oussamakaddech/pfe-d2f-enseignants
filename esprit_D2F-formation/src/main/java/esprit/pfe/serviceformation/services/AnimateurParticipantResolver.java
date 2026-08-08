package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.FormationWorkflowRequestAdditionConfig;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnimateurParticipantResolver {

    private final EnseignantRepository enseignantRepository;

    public List<Enseignant> resolveAnimateurs(
            FormationWorkflowRequestAdditionConfig.AnimateurAdditionConfig config) {
        if (config == null) {
            return new ArrayList<>();
        }

        return resolve(config.getMode(), config.getManualIds(), config.getDeptIds(), config.getUpIds(), "animateurs");
    }

    public List<Enseignant> resolveParticipants(
            FormationWorkflowRequestAdditionConfig.ParticipantAdditionConfig config) {
        if (config == null) {
            return new ArrayList<>();
        }

        return resolve(config.getMode(), config.getManualIds(), config.getDeptIds(), config.getUpIds(), "participants");
    }

    private List<Enseignant> resolve(
            FormationWorkflowRequestAdditionConfig.AdditionMode mode,
            List<String> manualIds,
            List<String> deptIds,
            List<String> upIds,
            String type) {

        if (mode == null) {
            log.warn("Mode is null for {}, returning empty list", type);
            return new ArrayList<>();
        }

        return switch (mode) {
            case MANUAL -> resolveManual(manualIds, type);
            case AUTO_BY_DEPT -> resolveByDept(deptIds, type);
            case AUTO_BY_UP -> resolveByUp(upIds, type);
        };
    }

    private List<Enseignant> resolveManual(List<String> manualIds, String type) {
        if (manualIds == null || manualIds.isEmpty()) {
            return new ArrayList<>();
        }

        try {
            List<Enseignant> result = enseignantRepository.findAllById(manualIds);
            log.debug("Resolved {} {} manually: {} found", manualIds.size(), type, result.size());
            return result;
        } catch (Exception e) {
            log.error("Error resolving manual {} : {}", type, e.getMessage());
            return new ArrayList<>();
        }
    }

    private List<Enseignant> resolveByDept(List<String> deptIds, String type) {
        if (deptIds == null || deptIds.isEmpty()) {
            return new ArrayList<>();
        }

        try {
            List<Enseignant> result = enseignantRepository.findByDeptIdIn(deptIds);
            log.debug("Resolved {} by {} departments: {} found", type, deptIds.size(), result.size());
            return result;
        } catch (Exception e) {
            log.error("Error resolving {} by department: {}", type, e.getMessage());
            return new ArrayList<>();
        }
    }

    private List<Enseignant> resolveByUp(List<String> upIds, String type) {
        if (upIds == null || upIds.isEmpty()) {
            return new ArrayList<>();
        }

        try {
            List<Enseignant> result = enseignantRepository.findByUpIdIn(upIds);
            log.debug("Resolved {} by {} UPs: {} found", type, upIds.size(), result.size());
            return result;
        } catch (Exception e) {
            log.error("Error resolving {} by UP: {}", type, e.getMessage());
            return new ArrayList<>();
        }
    }
}
