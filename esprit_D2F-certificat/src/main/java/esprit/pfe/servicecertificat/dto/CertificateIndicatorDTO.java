package esprit.pfe.servicecertificat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Indicateurs de certification (étape 7) :
 * éligibles, délivrés, en attente, révoqués.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificateIndicatorDTO {

    /** Certificats créés après validation des critères d'éligibilité. */
    private Long eligibleCount;

    /** Certificats délivrés (remis au participant, delivered = true). */
    private Long deliveredCount;

    /** Certificats en attente de délivrance (delivered = false, statut ISSUED/PENDING). */
    private Long pendingCount;

    /** Certificats révoqués (statut REVOKED). */
    private Long revokedCount;

    /** Certificats en attente, filtrés par formation (optionnel). */
    public static CertificateIndicatorDTO forFormation(Long eligible, Long delivered, Long pending, Long revoked) {
        return CertificateIndicatorDTO.builder()
                .eligibleCount(eligible)
                .deliveredCount(delivered)
                .pendingCount(pending)
                .revokedCount(revoked)
                .build();
    }
}
