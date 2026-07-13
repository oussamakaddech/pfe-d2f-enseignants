package esprit.pfe.serviceformation.microsoft;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@ExtendWith(MockitoExtension.class)
class MicrosoftGraphClientProviderTest {

    @InjectMocks private MicrosoftGraphClientProvider provider;

    @Test
    void testGetGraphClient() {
        ReflectionTestUtils.setField(provider, "clientId", "client");
        ReflectionTestUtils.setField(provider, "tenantId", "tenant");
        ReflectionTestUtils.setField(provider, "clientSecret", "secret");

        assertDoesNotThrow(() -> assertNotNull(provider.getGraphClient()));
    }
}
