package esprit.pfe.servicecertificat.exception;

/**
 * Échec de génération d'un QR code de vérification (encodage ZXing ou
 * écriture PNG). Exception métier spécifique — jamais de {@code throws
 * Exception} générique dans la signature publique.
 */
public class QrCodeGenerationException extends RuntimeException {
    public QrCodeGenerationException(String message, Throwable cause) {
        super(message, cause);
    }
}
