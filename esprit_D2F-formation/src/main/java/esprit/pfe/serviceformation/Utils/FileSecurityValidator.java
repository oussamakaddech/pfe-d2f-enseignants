package esprit.pfe.serviceformation.utils;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

/**
 * Validation defense-en-profondeur pour les uploads de fichiers.
 * <p>
 * Cette classe verifie :
 * <ul>
 *   <li>Magic bytes du contenu (le Content-Type fourni par le client n'est pas
 *       fiable, peut etre falsifie).</li>
 *   <li>Coherence extension &harr; type MIME declare.</li>
 *   <li>Nom de fichier (longueur, caracteres dangereux, path traversal).</li>
 *   <li>Refus des fichiers vides.</li>
 * </ul>
 * <p>
 * Cette validation ne remplace pas un antivirus (ClamAV recommande en infra),
 * mais offre une premiere barriere applicative bloquant les payloads triviaux.
 */
public final class FileSecurityValidator {

    public static final int MAX_FILENAME_LENGTH = 255;
    public static final long MIN_FILE_SIZE_BYTES = 1L;

    // Signatures (magic bytes) attendues par type MIME.
    private static final Map<String, byte[][]> MAGIC_BYTES = Map.of(
        "application/pdf", new byte[][]{ {0x25, 0x50, 0x44, 0x46} },           // %PDF
        "image/jpeg", new byte[][]{ {(byte)0xFF, (byte)0xD8, (byte)0xFF} },
        "image/png", new byte[][]{ {(byte)0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A} },
        "image/gif", new byte[][]{ {0x47, 0x49, 0x46, 0x38} },                 // GIF8
        "application/msword", new byte[][]{ {(byte)0xD0, (byte)0xCF, 0x11, (byte)0xE0} }, // OLE2
        "application/vnd.ms-excel", new byte[][]{ {(byte)0xD0, (byte)0xCF, 0x11, (byte)0xE0} },
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            new byte[][]{ {0x50, 0x4B, 0x03, 0x04} },                          // PK (zip)
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            new byte[][]{ {0x50, 0x4B, 0x03, 0x04} }                           // PK (zip)
    );

    // Extensions autorisees par MIME (defense en profondeur).
    private static final Map<String, Set<String>> ALLOWED_EXTENSIONS = Map.of(
        "application/pdf", Set.of("pdf"),
        "application/msword", Set.of("doc"),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", Set.of("docx"),
        "application/vnd.ms-excel", Set.of("xls"),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Set.of("xlsx"),
        "image/jpeg", Set.of("jpg", "jpeg"),
        "image/png", Set.of("png"),
        "image/gif", Set.of("gif"),
        "text/plain", Set.of("txt"),
        "text/csv", Set.of("csv")
    );

    private FileSecurityValidator() { }

    /**
     * Valide un fichier uploade. Retourne {@code null} si le fichier est conforme,
     * sinon un message d'erreur explicite (a destination du client).
     */
    public static String validate(MultipartFile file, Set<String> allowedMimeTypes, long maxSizeBytes) {
        if (file == null || file.isEmpty()) {
            return "Fichier vide ou absent.";
        }
        if (file.getSize() < MIN_FILE_SIZE_BYTES) {
            return "Fichier trop petit (taille = " + file.getSize() + " octets).";
        }
        if (file.getSize() > maxSizeBytes) {
            return "Fichier trop volumineux : " + file.getSize()
                    + " octets. Maximum : " + maxSizeBytes + " octets.";
        }

        String contentType = file.getContentType();
        if (contentType == null || !allowedMimeTypes.contains(contentType)) {
            return "Type de fichier non autorise : " + contentType;
        }

        String filename = file.getOriginalFilename();
        String filenameError = validateFilename(filename);
        if (filenameError != null) {
            return filenameError;
        }

        String extension = extractExtension(filename);
        Set<String> allowedExt = ALLOWED_EXTENSIONS.get(contentType);
        if (allowedExt != null && (extension == null || !allowedExt.contains(extension))) {
            return "Extension de fichier '" + extension + "' incoherente avec le type MIME "
                    + contentType + ".";
        }

        try {
            if (!hasValidMagicBytes(file, contentType)) {
                return "Le contenu du fichier ne correspond pas au type MIME declare ("
                        + contentType + ").";
            }
        } catch (IOException e) {
            return "Impossible de lire le fichier pour validation : " + e.getMessage();
        }

        return null;
    }

    static String validateFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "Nom de fichier obligatoire.";
        }
        if (filename.length() > MAX_FILENAME_LENGTH) {
            return "Nom de fichier trop long (max " + MAX_FILENAME_LENGTH + " caracteres).";
        }
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")
                || filename.contains("\0")) {
            return "Nom de fichier contient des caracteres interdits.";
        }
        return null;
    }

    static String extractExtension(String filename) {
        if (filename == null) {
            return null;
        }
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            return null;
        }
        return filename.substring(dot + 1).toLowerCase();
    }

    static boolean hasValidMagicBytes(MultipartFile file, String contentType) throws IOException {
        byte[][] expectedSignatures = MAGIC_BYTES.get(contentType);
        if (expectedSignatures == null) {
            // Types texte (text/plain, text/csv) : pas de magic bytes fiables, on accepte.
            return true;
        }
        // Lit au plus les 16 premiers octets (suffisant pour toutes les signatures supportees).
        byte[] header = new byte[16];
        int read;
        try (var in = file.getInputStream()) {
            read = in.read(header);
        }
        if (read <= 0) {
            return false;
        }
        for (byte[] signature : expectedSignatures) {
            if (read >= signature.length && startsWith(header, signature)) {
                return true;
            }
        }
        return false;
    }

    private static boolean startsWith(byte[] data, byte[] prefix) {
        for (int i = 0; i < prefix.length; i++) {
            if (data[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }
}
