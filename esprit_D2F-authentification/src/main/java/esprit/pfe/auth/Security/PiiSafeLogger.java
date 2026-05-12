package esprit.pfe.auth.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.regex.Pattern;

public final class PiiSafeLogger {
    private static final Pattern EMAIL_PATTERN = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
    private static final Pattern PHONE_PATTERN = Pattern.compile("(\\+\\d{1,3}[\\s-]?)?\\d{8,15}");
    private static final Pattern IP_PATTERN = Pattern.compile("\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b");
    private static final String REPLACEMENT = "***";

    private PiiSafeLogger() {}

    public static String sanitize(String message) {
        if (message == null) return null;
        String s = EMAIL_PATTERN.matcher(message).replaceAll(REPLACEMENT);
        s = PHONE_PATTERN.matcher(s).replaceAll(REPLACEMENT);
        s = IP_PATTERN.matcher(s).replaceAll(REPLACEMENT);
        return s;
    }

    public static Logger getLogger(Class<?> clazz) {
        return LoggerFactory.getLogger(clazz);
    }

    public static void info(Class<?> clazz, String msg) { getLogger(clazz).info(sanitize(msg)); }
    public static void warn(Class<?> clazz, String msg) { getLogger(clazz).warn(sanitize(msg)); }
    public static void error(Class<?> clazz, String msg, Throwable t) { getLogger(clazz).error(sanitize(msg), t); }
}
