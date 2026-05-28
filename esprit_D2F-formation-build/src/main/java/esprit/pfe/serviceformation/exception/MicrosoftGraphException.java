package esprit.pfe.serviceformation.exception;

/**
 * Exception thrown when Microsoft Graph API calls fail.
 * Results in HTTP 503 SERVICE_UNAVAILABLE response.
 */
public class MicrosoftGraphException extends RuntimeException {
    
    private final String serviceName;
    private final int statusCode;
    
    public MicrosoftGraphException(String message) {
        super(message);
        this.serviceName = "Microsoft Graph";
        this.statusCode = 0;
    }
    
    public MicrosoftGraphException(String message, Throwable cause) {
        super(message, cause);
        this.serviceName = "Microsoft Graph";
        this.statusCode = 0;
    }
    
    public MicrosoftGraphException(String serviceName, String message, int statusCode) {
        super(String.format("%s: %s (status: %d)", serviceName, message, statusCode));
        this.serviceName = serviceName;
        this.statusCode = statusCode;
    }
    
    public MicrosoftGraphException(String serviceName, String message, int statusCode, Throwable cause) {
        super(String.format("%s: %s (status: %d)", serviceName, message, statusCode), cause);
        this.serviceName = serviceName;
        this.statusCode = statusCode;
    }
    
    public String getServiceName() {
        return serviceName;
    }
    
    public int getStatusCode() {
        return statusCode;
    }
}