package esprit.pfe.serviceformation.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.regex.Pattern;

public final class PiiSafeLogger {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
    private static final String EMAIL_REPLACEMENT = "***@***.***";

    private PiiSafeLogger() {}

    public static Logger getLogger(Class<?> clazz) {
        return LoggerFactory.getLogger(clazz);
    }

    public static String sanitize(String message) {
        if (message == null) return null;
        return EMAIL_PATTERN.matcher(message).replaceAll(EMAIL_REPLACEMENT);
    }
}
