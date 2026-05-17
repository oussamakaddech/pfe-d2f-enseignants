package esprit.pfe.serviceanalyse.dto.passport;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO racine du Passeport de Compétences.
 * Agrège toutes les données du profil enseignant en un seul objet sérialisable.
 * Exemple JSON raccourci :
 * {
 *   "identity": { "nom": "Ben Ali", "prenom": "Sami", ... },
 *   "dateGeneration": "2026-05-14T10:30:00",
 *   "scoreGlobal": 3.4,
 *   "statut": "suivi",
 *   "totalSavoirsMaitrises": 18,
 *   "totalFormations": 4,
 *   "totalCertifications": 2,
 *   "totalGaps": 3,
 *   "domaines": [...],
 *   "formations": [...],
 *   "certifications": [...],
 *   "gaps": [...],
 *   "recommandations": [...]
 * }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TeacherSkillPassportDTO {

    private TeacherIdentityDTO identity;

    private String dateGeneration;

    // ── Indicateurs globaux ──────────────────────────────────────────────
    private double scoreGlobal;
    private String statut;
    private int totalSavoirsMaitrises;
    private int totalFormations;
    private int totalCertifications;
    private int totalGaps;

    // ── Sections détaillées ──────────────────────────────────────────────
    private List<DomainSummaryDTO> domaines;
    private List<TrainingHistoryDTO> formations;
    private List<CertificationSummaryDTO> certifications;
    private List<SkillGapSummaryDTO> gaps;
    private List<RecommendationSummaryDTO> recommandations;
}
