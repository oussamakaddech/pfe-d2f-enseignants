package esprit.pfe.serviceformation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

public class FormationWorkflowRequestAdditionConfig {

    @Schema(description = "Mode of addition: MANUAL (explicit IDs), AUTO_BY_DEPT (filter by departments), AUTO_BY_UP (filter by organizational units)")
    public enum AdditionMode {
        MANUAL,
        AUTO_BY_DEPT,
        AUTO_BY_UP
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @Schema(description = "Configuration for animator addition")
    public static class AnimateurAdditionConfig {
        @NotNull(message = "Mode d'ajout des animateurs est obligatoire")
        @Schema(description = "Addition mode (MANUAL, AUTO_BY_DEPT, AUTO_BY_UP)")
        private AdditionMode mode;

        @Schema(description = "List of animator IDs (used when mode=MANUAL)")
        private List<String> manualIds = new ArrayList<>();

        @Schema(description = "List of department IDs (used when mode=AUTO_BY_DEPT)")
        private List<String> deptIds = new ArrayList<>();

        @Schema(description = "List of UP/organizational unit IDs (used when mode=AUTO_BY_UP)")
        private List<String> upIds = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @Schema(description = "Configuration for participant addition")
    public static class ParticipantAdditionConfig {
        @NotNull(message = "Mode d'ajout des participants est obligatoire")
        @Schema(description = "Addition mode (MANUAL, AUTO_BY_DEPT, AUTO_BY_UP)")
        private AdditionMode mode;

        @Schema(description = "List of participant IDs (used when mode=MANUAL)")
        private List<String> manualIds = new ArrayList<>();

        @Schema(description = "List of department IDs (used when mode=AUTO_BY_DEPT)")
        private List<String> deptIds = new ArrayList<>();

        @Schema(description = "List of UP/organizational unit IDs (used when mode=AUTO_BY_UP)")
        private List<String> upIds = new ArrayList<>();
    }
}
