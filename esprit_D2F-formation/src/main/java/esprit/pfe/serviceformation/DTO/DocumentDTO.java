package esprit.pfe.serviceformation.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentDTO implements Serializable {
    private Long idDocument;
    private String nomDocument;
    private boolean obligation;
    private LocalDate date;
    private String filePath;
    private String pathType;

    // Informations essentielles de la formation associée
    private Long formationId;
    private String formationTitre;
    // Vous pouvez ajouter d'autres champs si nécessaire (objectif, designation, etc.)
}

