package esprit.pfe.serviceformation.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.regex.Pattern;

public final class PiiSafeLogger {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
    private static final String EMAIL_REPLACEMENT = "***@***.***";

    private static final Pattern PHONE_PATTERN = Pattern.compile("(\\+\\d{1,3}[\\s-]?)?\\d{8,15}");
    private static final String PHONE_REPLACEMENT = "******XXX";

    private static final Pattern SSN_PATTERN = Pattern.compile("\\b\\d{8,15}\\b");
    private static final String SSN_REPLACEMENT = "********";

    private static final Pattern IP_PATTERN = Pattern.compile("\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b");
    private static final String IP_REPLACEMENT = "*.*.*.*";

    private PiiSafeLogger() {
    }

    public static Logger getLogger(Class<?> clazz) {
        return LoggerFactory.getLogger(clazz);
    }

    public static String sanitize(String message) {
        if (message == null)
            return null;
        String sanitized = EMAIL_PATTERN.matcher(message).replaceAll(EMAIL_REPLACEMENT);
        sanitized = PHONE_PATTERN.matcher(sanitized).replaceAll(PHONE_REPLACEMENT);
        sanitized = SSN_PATTERN.matcher(sanitized).replaceAll(SSN_REPLACEMENT);
        sanitized = IP_PATTERN.matcher(sanitized).replaceAll(IP_REPLACEMENT);
        return sanitized;
    }

    public static void info(Class<?> clazz, String message) {
        Logger logger = getLogger(clazz);
        if (logger.isInfoEnabled()) {
            logger.info(sanitize(message));
        }
    }

    public static void warn(Class<?> clazz, String message) {
        Logger logger = getLogger(clazz);
        if (logger.isWarnEnabled()) {
            logger.warn(sanitize(message));
        }
    }

    public static void error(Class<?> clazz, String message, Throwable t) {
        Logger logger = getLogger(clazz);
        if (logger.isErrorEnabled()) {
            logger.error(sanitize(message), t);
        }
    }

    public static void debug(Class<?> clazz, String message) {
        Logger logger = getLogger(clazz);
        if (logger.isDebugEnabled()) {
            logger.debug(sanitize(message));
        }
    }
}
