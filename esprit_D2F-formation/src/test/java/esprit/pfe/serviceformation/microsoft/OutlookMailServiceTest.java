package esprit.pfe.serviceformation.microsoft;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.microsoft.graph.requests.GraphServiceClient;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OutlookMailServiceTest {

    @Mock private MicrosoftGraphClientProvider graphClientProvider;
    @Mock(answer = Answers.RETURNS_DEEP_STUBS) private GraphServiceClient<okhttp3.Request> graphClient;

    @InjectMocks private OutlookMailService outlookMailService;

    @Test
    void testSendEmail() {
        when(graphClientProvider.getGraphClient()).thenReturn(graphClient);
        assertDoesNotThrow(() -> outlookMailService.sendMail("to", "subj", "body"));
    }
}
