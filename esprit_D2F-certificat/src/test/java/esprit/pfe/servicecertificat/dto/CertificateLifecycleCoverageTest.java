package esprit.pfe.servicecertificat.dto;

import esprit.pfe.servicecertificat.entities.CertificateStatus;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests des DTO et enums du cycle de vie des certificats.
 */
class CertificateLifecycleCoverageTest {

    @Test
    void certificateStatus_exposeLesTroisEtats() {
        assertEquals(3, CertificateStatus.values().length);
        assertEquals(CertificateStatus.PENDING, CertificateStatus.valueOf("PENDING"));
        assertEquals(CertificateStatus.ISSUED, CertificateStatus.valueOf("ISSUED"));
        assertEquals(CertificateStatus.REVOKED, CertificateStatus.valueOf("REVOKED"));
    }

    @Test
    void indicatorDto_forFormation_construitLesCompteurs() {
        CertificateIndicatorDTO dto = CertificateIndicatorDTO.forFormation(10L, 7L, 3L, 0L);

        assertEquals(10L, dto.getEligibleCount());
        assertEquals(7L, dto.getDeliveredCount());
        assertEquals(3L, dto.getPendingCount());
        assertEquals(0L, dto.getRevokedCount());
    }

    @Test
    void indicatorDto_builderEtAccesseurs() {
        CertificateIndicatorDTO dto = CertificateIndicatorDTO.builder()
                .eligibleCount(5L)
                .deliveredCount(4L)
                .pendingCount(1L)
                .revokedCount(0L)
                .build();

        assertNotNull(dto.toString());
        assertEquals(dto, CertificateIndicatorDTO.builder()
                .eligibleCount(5L)
                .deliveredCount(4L)
                .pendingCount(1L)
                .revokedCount(0L)
                .build());
        assertEquals(dto.hashCode(), CertificateIndicatorDTO.builder()
                .eligibleCount(5L)
                .deliveredCount(4L)
                .pendingCount(1L)
                .revokedCount(0L)
                .build().hashCode());
    }
}
