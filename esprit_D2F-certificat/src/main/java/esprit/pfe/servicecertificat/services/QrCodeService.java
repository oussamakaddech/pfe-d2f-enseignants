package esprit.pfe.servicecertificat.services;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

import java.io.ByteArrayOutputStream;
import java.util.Map;

/**
 * Génération des QR codes de vérification (étape 5).
 * Le QR encode uniquement l'URL publique de vérification du certificat —
 * aucune donnée personnelle n'est encodée dans le QR code.
 */
public class QrCodeService {

    private static final int DEFAULT_SIZE = 200;

    private QrCodeService() {
        // Utility class — not instantiable
    }

    /**
     * Génère le contenu du QR code : l'URL publique de vérification.
     */
    public static String buildVerificationUrl(String publicBaseUrl, String verificationToken) {
        String base = publicBaseUrl != null ? publicBaseUrl : "http://localhost:5173";
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/certificats/verification/" + verificationToken;
    }

    /**
     * Génère l'image PNG du QR code pour l'URL de vérification donnée.
     *
     * @param content contenu encodé (URL de vérification)
     * @return bytes PNG de l'image QR
     */
    public static byte[] generateQrPng(String content) throws Exception {
        return generateQrPng(content, DEFAULT_SIZE, DEFAULT_SIZE);
    }

    /**
     * Génère l'image PNG du QR code avec dimensions personnalisées.
     */
    public static byte[] generateQrPng(String content, int width, int height) throws Exception {
        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(content, BarcodeFormat.QR_CODE, width, height,
                Map.of(EncodeHintType.MARGIN, 1));
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return out.toByteArray();
        }
    }
}
