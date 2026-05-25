
package esprit.pfe.serviceanalyse.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PdfGenerationException - Tests")
class PdfGenerationExceptionTest {

    @Test
    @DisplayName("constructeur avec message et cause")
    void constructor_shouldSetMessageAndCause() {
        Throwable cause = new RuntimeException("iText error");
        PdfGenerationException ex = new PdfGenerationException("PDF failed", cause);

        assertThat(ex.getMessage()).isEqualTo("PDF failed");
        assertThat(ex.getCause()).isSameAs(cause);
    }

    @Test
    @DisplayName("constructeur avec cause null")
    void constructor_withNullCause() {
        PdfGenerationException ex = new PdfGenerationException("PDF failed", null);

        assertThat(ex.getMessage()).isEqualTo("PDF failed");
        assertThat(ex.getCause()).isNull();
    }
}
