package esprit.pfe.serviceformation.dto.calendar;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Erreur ou avertissement rattaché à une ligne du fichier importé.
 * Les lignes invalides sont ignorées sans interrompre l'import global.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportRowErrorDTO {

    private int row;
    private String field;
    private String message;

    /** ERROR (ligne ignorée) ou WARNING (importée avec réserve). */
    @Builder.Default
    private String severity = "ERROR";

    public static ImportRowErrorDTO error(int row, String field, String message) {
        return ImportRowErrorDTO.builder().row(row).field(field).message(message).severity("ERROR").build();
    }

    public static ImportRowErrorDTO warning(int row, String field, String message) {
        return ImportRowErrorDTO.builder().row(row).field(field).message(message).severity("WARNING").build();
    }
}
