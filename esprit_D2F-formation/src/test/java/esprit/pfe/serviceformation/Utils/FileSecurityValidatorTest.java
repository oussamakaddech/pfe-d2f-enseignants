package esprit.pfe.serviceformation.utils;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class FileSecurityValidatorTest {

    private static final Set<String> ALLOWED = Set.of(
        "application/pdf", "image/png", "text/plain", "image/jpeg"
    );
    private static final long MAX_SIZE = 10 * 1024 * 1024L;

    @Test
    void validate_rejectsEmptyFile() {
        MultipartFile empty = new MockMultipartFile("file", "test.pdf", "application/pdf", new byte[0]);
        String result = FileSecurityValidator.validate(empty, ALLOWED, MAX_SIZE);
        assertNotNull(result);
        assertTrue(result.toLowerCase().contains("vide"));
    }

    @Test
    void validate_rejectsTooLargeFile() {
        byte[] big = new byte[(int) MAX_SIZE + 1];
        big[0] = 0x25; big[1] = 0x50; big[2] = 0x44; big[3] = 0x46;
        MultipartFile file = new MockMultipartFile("file", "big.pdf", "application/pdf", big);
        String result = FileSecurityValidator.validate(file, ALLOWED, MAX_SIZE);
        assertNotNull(result);
        assertTrue(result.contains("volumineux"));
    }

    @Test
    void validate_rejectsUnknownMime() {
        byte[] data = new byte[]{0x25, 0x50, 0x44, 0x46, 0x20};
        MultipartFile file = new MockMultipartFile("file", "test.pdf", "application/x-evil", data);
        String result = FileSecurityValidator.validate(file, ALLOWED, MAX_SIZE);
        assertNotNull(result);
        assertTrue(result.contains("non autorise"));
    }

    @Test
    void validate_rejectsPathTraversalInFilename() {
        byte[] data = new byte[]{0x25, 0x50, 0x44, 0x46, 0x20};
        MultipartFile file = new MockMultipartFile("file", "../../../etc/passwd",
            "application/pdf", data);
        String result = FileSecurityValidator.validate(file, ALLOWED, MAX_SIZE);
        assertNotNull(result);
        assertTrue(result.contains("interdits"));
    }

    @Test
    void validate_rejectsNullByteInFilename() {
        byte[] data = new byte[]{0x25, 0x50, 0x44, 0x46, 0x20};
        MultipartFile file = new MockMultipartFile("file", "doc\0.pdf",
            "application/pdf", data);
        String result = FileSecurityValidator.validate(file, ALLOWED, MAX_SIZE);
        assertNotNull(result);
        assertTrue(result.contains("interdits"));
    }

    @Test
    void validate_rejectsExtensionMismatch() {
        byte[] data = new byte[]{0x25, 0x50, 0x44, 0x46, 0x20};
        // PDF content claimed as image/png with .png extension → fails magic bytes
        MultipartFile file = new MockMultipartFile("file", "fake.png",
            "image/png", data);
        String result = FileSecurityValidator.validate(file, ALLOWED, MAX_SIZE);
        assertNotNull(result);
    }

    @Test
    void validate_rejectsFakePdf() {
        // Not a real PDF (no %PDF magic) but claimed as application/pdf
        byte[] notPdf = new byte[]{0x00, 0x01, 0x02, 0x03, 0x04};
        MultipartFile file = new MockMultipartFile("file", "fake.pdf",
            "application/pdf", notPdf);
        String result = FileSecurityValidator.validate(file, ALLOWED, MAX_SIZE);
        assertNotNull(result);
        assertTrue(result.contains("correspond pas"));
    }

    @Test
    void validate_acceptsValidPdf() {
        byte[] realPdf = new byte[]{0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34}; // %PDF-1.4
        MultipartFile file = new MockMultipartFile("file", "valid.pdf",
            "application/pdf", realPdf);
        assertNull(FileSecurityValidator.validate(file, ALLOWED, MAX_SIZE));
    }

    @Test
    void validate_acceptsValidPng() {
        byte[] realPng = new byte[]{
            (byte)0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D
        };
        MultipartFile file = new MockMultipartFile("file", "valid.png",
            "image/png", realPng);
        assertNull(FileSecurityValidator.validate(file, ALLOWED, MAX_SIZE));
    }

    @Test
    void validate_acceptsTextFileWithoutMagicBytes() {
        byte[] txt = "Hello World\n".getBytes();
        MultipartFile file = new MockMultipartFile("file", "note.txt",
            "text/plain", txt);
        assertNull(FileSecurityValidator.validate(file, ALLOWED, MAX_SIZE));
    }

    @Test
    void validateFilename_acceptsLegitimateNames() {
        assertNull(FileSecurityValidator.validateFilename("rapport-2026.pdf"));
        assertNull(FileSecurityValidator.validateFilename("Mon Document.docx"));
    }

    @Test
    void validateFilename_rejectsBackslash() {
        assertNotNull(FileSecurityValidator.validateFilename("path\\to\\file.pdf"));
    }

    @Test
    void extractExtension_returnsLowercaseExtension() {
        assertEquals("pdf", FileSecurityValidator.extractExtension("Report.PDF"));
        assertEquals("docx", FileSecurityValidator.extractExtension("File.DOCX"));
        assertNull(FileSecurityValidator.extractExtension("noextension"));
        assertNull(FileSecurityValidator.extractExtension("ends.with.dot."));
    }
}
