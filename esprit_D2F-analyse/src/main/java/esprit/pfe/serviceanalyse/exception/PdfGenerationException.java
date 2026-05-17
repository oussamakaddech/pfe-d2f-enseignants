package esprit.pfe.serviceanalyse.exception;

/**
 * Exception thrown when PDF generation fails (iText rendering, I/O errors, etc.).
 */
public class PdfGenerationException extends RuntimeException {
    public PdfGenerationException(String message, Throwable cause) {
        super(message, cause);
    }
}
