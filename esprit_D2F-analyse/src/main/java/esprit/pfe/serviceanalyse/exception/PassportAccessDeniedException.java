package esprit.pfe.serviceanalyse.exception;

public class PassportAccessDeniedException extends RuntimeException {
    public PassportAccessDeniedException(String message) {
        super(message);
    }
}
