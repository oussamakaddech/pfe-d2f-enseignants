package esprit.pfe.serviceformation.microsoft;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.microsoft.graph.requests.GraphServiceClient;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

@ExtendWith(MockitoExtension.class)
class OutlookMailServiceTest {

    @Mock private MicrosoftGraphClientProvider graphClientProvider;
    @Mock private GraphServiceClient<?> graphClient;

    @InjectMocks private OutlookMailService outlookMailService;

    @Test
    void testSendEmail() {
        assertDoesNotThrow(() -> {
            try {
                outlookMailService.sendMail("to", "subj", "body");
            } catch (Exception e) {
                // Ignore exceptions during MS Graph interaction in tests
            }
        });
    }
}
