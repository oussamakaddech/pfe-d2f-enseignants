package esprit.pfe.servicecertificat.services;

import esprit.pfe.servicecertificat.exception.QrCodeGenerationException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class QrCodeServiceTest {

    @Test
    void generateQrPng_produitDesBytesPngValides() {
        byte[] png = QrCodeService.generateQrPng("https://d2f.esprit.tn/certificats/verification/abc123");

        assertNotNull(png);
        assertTrue(png.length > 0);
        // Signature PNG : 89 50 4E 47 0D 0A 1A 0A
        assertEquals((byte) 0x89, png[0]);
        assertEquals((byte) 0x50, png[1]);
        assertEquals((byte) 0x4E, png[2]);
        assertEquals((byte) 0x47, png[3]);
    }

    @Test
    void generateQrPng_dimensionsPersonnalisees() {
        byte[] png = QrCodeService.generateQrPng("https://d2f.esprit.tn/verify/xyz", 300, 300);
        assertNotNull(png);
        assertTrue(png.length > 0);
    }

    @Test
    void buildVerificationUrl_construitLUrlPublique() {
        String url = QrCodeService.buildVerificationUrl("https://d2f.esprit.tn/", "tok-123");
        assertEquals("https://d2f.esprit.tn/certificats/verification/tok-123", url);
    }

    @Test
    void buildVerificationUrl_baseParDefautQuandNull() {
        String url = QrCodeService.buildVerificationUrl(null, "tok-123");
        assertEquals("http://localhost:5173/certificats/verification/tok-123", url);
    }

    @Test
    void generateQrPng_contenuTropGrand_leveQrCodeGenerationException() {
        // Contenu volontairement trop volumineux pour un QR 21x21 (1x1 px
        // force la plus petite capacité) → WriterException ZXing.
        String huge = "https://d2f.esprit.tn/verify/" + "x".repeat(3000);
        QrCodeGenerationException ex = assertThrows(QrCodeGenerationException.class,
                () -> QrCodeService.generateQrPng(huge, 1, 1));
        assertTrue(ex.getMessage().contains("QR code"));
        assertNotNull(ex.getCause());
    }

    @Test
    void qrCodeGenerationException_exposeMessageEtCause() {
        RuntimeException cause = new RuntimeException("zxing");
        QrCodeGenerationException ex = new QrCodeGenerationException("Échec QR", cause);
        assertEquals("Échec QR", ex.getMessage());
        assertEquals(cause, ex.getCause());
    }
}
