package esprit.pfe.auth.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.regex.Pattern;

public final class PiiSafeLogger {
    private static final Pattern EMAIL_PATTERN = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
    private static final Pattern PHONE_PATTERN = Pattern.compile("(\\+\\d{1,3}[-\\s])?\\d{3}-\\d{3}-\\d{4}|\\b\\d{10,15}\\b");
    private static final Pattern SSN_PATTERN = Pattern.compile("\\b\\d{3}-\\d{2}-\\d{4}\\b|\\b\\d{9}\\b");
    private static final Pattern IP_PATTERN = Pattern.compile("\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b");
    private static final String REPLACEMENT = "***";

    private PiiSafeLogger() {
    }

    public static String sanitize(String message) {
        if (message == null)
            return null;
        String s = EMAIL_PATTERN.matcher(message).replaceAll(REPLACEMENT);
        s = IP_PATTERN.matcher(s).replaceAll(REPLACEMENT);
        s = sanitizePhones(s);
        s = SSN_PATTERN.matcher(s).replaceAll(REPLACEMENT);
        return s;
    }

    private static String sanitizePhones(String message) {
        var matcher = PHONE_PATTERN.matcher(message);
        var sb = new StringBuilder();
        while (matcher.find()) {
            String prefix = matcher.group(1) != null ? matcher.group(1) : "";
            matcher.appendReplacement(sb, prefix + REPLACEMENT);
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    public static Logger getLogger(Class<?> clazz) {
        return LoggerFactory.getLogger(clazz);
    }

    public static void info(Class<?> clazz, String msg) {
        Logger logger = getLogger(clazz);
        if (logger.isInfoEnabled()) {
            logger.info(sanitize(msg));
        }
    }

    public static void warn(Class<?> clazz, String msg) {
        Logger logger = getLogger(clazz);
        if (logger.isWarnEnabled()) {
            logger.warn(sanitize(msg));
        }
    }

    public static void error(Class<?> clazz, String msg, Throwable t) {
        Logger logger = getLogger(clazz);
        if (logger.isErrorEnabled()) {
            logger.error(sanitize(msg), t);
        }
    }

    public static void debug(Class<?> clazz, String msg) {
        Logger logger = getLogger(clazz);
        if (logger.isDebugEnabled()) {
            logger.debug(sanitize(msg));
        }
    }
}
