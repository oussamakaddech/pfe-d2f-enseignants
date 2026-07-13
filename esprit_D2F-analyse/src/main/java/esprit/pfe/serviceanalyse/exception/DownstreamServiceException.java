package esprit.pfe.serviceanalyse.exception;

/** Raised when a required downstream D2F service (Formation, Competence, ...) is down. */
public class DownstreamServiceException extends RuntimeException {
    private final String service;

    public DownstreamServiceException(String service, Throwable cause) {
        super("Service en aval indisponible : " + service, cause);
        this.service = service;
    }

    public String getService() {
        return service;
    }
}
