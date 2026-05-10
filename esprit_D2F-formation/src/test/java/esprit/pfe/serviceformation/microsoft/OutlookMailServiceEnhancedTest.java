package esprit.pfe.serviceformation.microsoft;

import com.microsoft.graph.requests.GraphServiceClient;
import okhttp3.Request;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import java.util.stream.Stream;

/**
 * Tests améliorés pour OutlookMailService
 * Couvre les cas d'échec d'envoi et validation des paramètres
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("OutlookMailService - Tests améliorés")
class OutlookMailServiceEnhancedTest {

    @Mock
    private MicrosoftGraphClientProvider graphClientProvider;

    @Mock
    private GraphServiceClient<Request> graphClient;

    @InjectMocks
    private OutlookMailService outlookMailService;

    @BeforeEach
    void setUp() {
        lenient().when(graphClientProvider.getGraphClient()).thenReturn(graphClient);
    }

    @Test
    @DisplayName("sendMail - Devrait envoyer un email avec succès")
    void testSendMail_Success() {
        String to = "test@esprit.tn";
        String subject = "Test Subject";
        String htmlContent = "<h1>Test Content</h1>";

        outlookMailService.sendMail(to, subject, htmlContent);

        verify(graphClientProvider).getGraphClient();
        verify(graphClient).users(anyString());
    }

    @ParameterizedTest
    @MethodSource("provideErrorScenarios")
    @DisplayName("sendMail - Devrait gérer les différents scénarios d'erreur")
    void testSendMail_ErrorScenarios(String to, String subject, String htmlContent, String errorMessage) {
        if (errorMessage != null) {
            doThrow(new RuntimeException(errorMessage))
                    .when(graphClient).users(anyString());
        }

        // Ne devrait pas lever d'exception
        assertDoesNotThrow(() -> outlookMailService.sendMail(to, subject, htmlContent));

        if (to != null) {
            verify(graphClientProvider).getGraphClient();
            if (errorMessage != null) {
                verify(graphClient).users(anyString());
            }
        }
    }

    private static Stream<Arguments> provideErrorScenarios() {
        return Stream.of(
                Arguments.of("test@esprit.tn", "Test Subject", "<h1>Test Content</h1>", "Connection failed"),
                Arguments.of(null, null, null, null),
                Arguments.of("test@esprit.tn", "Test Subject", "<h1>Malformed</h2>", "Invalid HTML"),
                Arguments.of("invalid-email", "Test Subject", "<h1>Test Content</h1>", "Invalid recipient")
        );
    }

    @ParameterizedTest
    @MethodSource("provideNetworkErrorScenarios")
    @DisplayName("sendMail - Devrait gérer les erreurs réseau")
    void testSendMail_NetworkErrorScenarios(String errorMessage) {
        String to = "test@esprit.tn";
        String subject = "Test Subject";
        String htmlContent = "<h1>Test Content</h1>";

        doThrow(new RuntimeException(errorMessage))
                .when(graphClient).users(anyString());

        // Ne devrait pas lever d'exception
        assertDoesNotThrow(() -> outlookMailService.sendMail(to, subject, htmlContent));

        verify(graphClientProvider).getGraphClient();
        verify(graphClient).users(anyString());
    }

    private static Stream<Arguments> provideNetworkErrorScenarios() {
        return Stream.of(
                Arguments.of("Timeout"),
                Arguments.of("Authentication failed")
        );
    }

    @ParameterizedTest
    @MethodSource("provideMailContentScenarios")
    @DisplayName("sendMail - Devrait gérer différents scénarios de contenu")
    void testSendMail_ContentScenarios(String to, String subject, String htmlContent, String description) {
        outlookMailService.sendMail(to, subject, htmlContent);

        verify(graphClientProvider).getGraphClient();
        verify(graphClient).users(anyString());
    }

    private static Stream<Arguments> provideMailContentScenarios() {
        return Stream.of(
                Arguments.of(
                    "test@esprit.tn",
                    "Test Subject",
                    "<html><body>" +
                    "<h1>Formation Test</h1>" +
                    "<ul>" +
                    "<li><strong>Titre :</strong> Formation Java</li>" +
                    "<li><strong>Date :</strong> 2023-01-01</li>" +
                    "</ul>" +
                    "</body></html>",
                    "HTML complexe"
                ),
                Arguments.of(
                    "test@esprit.tn",
                    "",
                    "<h1>Test Content</h1>",
                    "Sujet vide"
                ),
                Arguments.of(
                    "test@esprit.tn",
                    "Test Subject",
                    "",
                    "Contenu vide"
                ),
                Arguments.of(
                    "test@esprit.tn",
                    "Test avec éàù & <script>",
                    "<h1>Test Content</h1>",
                    "Caractères spéciaux dans le sujet"
                )
        );
    }
}
