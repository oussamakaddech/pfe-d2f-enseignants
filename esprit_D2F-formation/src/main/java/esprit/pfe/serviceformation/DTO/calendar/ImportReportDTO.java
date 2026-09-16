package esprit.pfe.serviceformation.dto.calendar;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Rapport détaillé d'un import de calendrier (réponse de {@code POST /import}).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportReportDTO {

    private Long importLogId;
    private String fileName;

    /** SUCCESS, PARTIAL, FAILED ou DUPLICATE. */
    private String status;

    @Builder.Default
    private int formationsCreated = 0;
    @Builder.Default
    private int sessionsCreated = 0;
    @Builder.Default
    private int participantsImported = 0;
    @Builder.Default
    private int participantsUnmatched = 0;
    @Builder.Default
    private int rowsSkipped = 0;
    @Builder.Default
    private int conflictsDetected = 0;

    /** Renseigné si le fichier a déjà été importé (même empreinte). */
    private Long duplicateOfImportId;

    @Builder.Default
    private List<ImportRowErrorDTO> errors = new ArrayList<>();

    private ConflictReportDTO conflicts;
}
