package esprit.pfe.serviceformation.exception;

/**
 * Exception personnalisée pour les erreurs lors de l'import Excel
 * Remplace les exceptions génériques dans EnseignantExcelService
 */
public class ExcelImportException extends RuntimeException {

    public ExcelImportException(String message) {
        super(message);
    }

    public ExcelImportException(String message, Throwable cause) {
        super(message, cause);
    }
}
