package esprit.pfe.serviceformation.microsoft;

/**
 * Raised when an outbound email cannot be delivered through Microsoft Graph.
 * Wraps the underlying technical cause and is mapped to HTTP 5xx by the
 * global exception handler.
 */
public class MailDeliveryException extends RuntimeException {
    public MailDeliveryException(String message, Throwable cause) {
        super(message, cause);
    }
}
