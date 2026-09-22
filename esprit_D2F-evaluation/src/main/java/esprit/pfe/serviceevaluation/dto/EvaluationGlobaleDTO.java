package esprit.pfe.serviceevaluation.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationGlobaleDTO {

    // Cle technique : non requise en creation, requise en update.
    @Positive(message = "L'ID evaluation globale doit etre positif")
    private Long idEvalGlobale;

    @NotNull(message = "L'ID de la formation est obligatoire")
    @Positive(message = "L'ID formation doit etre positif")
    private Long formationId;

    @Size(max = 10, message = "L'enseignant evalue ne peut depasser 10 caracteres")
    private String enseignantId;

    @Size(max = 2000, message = "Le commentaire general ne peut depasser 2000 caracteres")
    private String commentaireGeneral;

    @NotNull(message = "La date d'evaluation est obligatoire")
    @PastOrPresent(message = "La date d'evaluation ne peut etre dans le futur")
    private LocalDate dateEvaluation;

    @NotNull(message = "La note globale est obligatoire")
    @DecimalMin(value = "0.0", inclusive = true, message = "La note doit etre >= 0")
    @DecimalMax(value = "20.0", inclusive = true, message = "La note doit etre <= 20")
    private Float noteGlobale;

    @Size(max = 1000, message = "La recommandation ne peut depasser 1000 caracteres")
    private String recommandation;

    // ── Critères structurés : Évaluation de la formation (0-5) ──
    @DecimalMin(value = "0.0", message = "La pertinence doit etre >= 0")
    @DecimalMax(value = "5.0", message = "La pertinence doit etre <= 5")
    private Float pertinenceContenu;

    @DecimalMin(value = "0.0", message = "L'organisation doit etre >= 0")
    @DecimalMax(value = "5.0", message = "L'organisation doit etre <= 5")
    private Float organisation;

    @DecimalMin(value = "0.0", message = "La qualité des supports doit etre >= 0")
    @DecimalMax(value = "5.0", message = "La qualité des supports doit etre <= 5")
    private Float qualiteSupports;

    @DecimalMin(value = "0.0", message = "La durée doit etre >= 0")
    @DecimalMax(value = "5.0", message = "La durée doit etre <= 5")
    private Float dureeAdaptee;

    @DecimalMin(value = "0.0", message = "La satisfaction doit etre >= 0")
    @DecimalMax(value = "5.0", message = "La satisfaction doit etre <= 5")
    private Float satisfactionGlobale;
}
