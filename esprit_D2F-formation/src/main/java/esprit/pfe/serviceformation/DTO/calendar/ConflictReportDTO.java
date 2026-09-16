package esprit.pfe.serviceformation.dto.calendar;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Rapport agrégé de détection de conflits sur le calendrier.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConflictReportDTO {

    @Builder.Default
    private int totalConflicts = 0;
    @Builder.Default
    private int roomOverlaps = 0;
    @Builder.Default
    private int duplicateFormations = 0;
    @Builder.Default
    private int sessionNumberingIssues = 0;

    @Builder.Default
    private List<ConflictDTO> conflicts = new ArrayList<>();
}
