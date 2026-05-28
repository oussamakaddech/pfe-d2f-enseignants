package esprit.pfe.serviceformation.microsoft;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertNull;

class MicrosoftGraphServiceTest {

    private MicrosoftGraphService service;

    @BeforeEach
    void setUp() {
        service = new MicrosoftGraphService(new SimpleMeterRegistry());
    }

    @Test
    void disabledAzureAdSkipsGraphCalls() {
        assertNull(service.uploadFile("report.txt", new byte[] {1, 2, 3}, "/formations/2026"));
        assertNull(service.sendMail("teacher@esprit.tn", "Subject", "Body"));
        assertNull(service.createCalendarEvent("Session", "2026-05-25T10:00:00", "2026-05-25T11:00:00", new String[] {"a@b.c"}));
    }

    @Test
    void enabledAzureAdReturnsGeneratedIds() {
        ReflectionTestUtils.setField(service, "azureAdEnabled", true);

        assertThat(service.uploadFile("report.txt", new byte[] {1, 2, 3}, "/formations/2026")).startsWith("GRAPH_ITEM_");
        assertThat(service.sendMail("teacher@esprit.tn", "Subject", "Body")).startsWith("MSG_");
        assertThat(service.createCalendarEvent("Session", "2026-05-25T10:00:00", "2026-05-25T11:00:00", new String[] {"a@b.c"}))
                .startsWith("CAL_");
    }

    @Test
    void fallbackMethodsReturnLocalOrQueuedValues() {
        assertThat(service.uploadFileFallback("report.txt", new byte[] {1, 2, 3}, "/formations/2026", new RuntimeException("x")))
                .startsWith("LOCAL_FALLBACK:");
        assertThat(service.sendMailFallback("teacher@esprit.tn", "Subject", "Body")).startsWith("QUEUED:");
        assertNull(service.createCalendarEventFallback("Session", "2026-05-25T10:00:00", "2026-05-25T11:00:00", new String[] {"a@b.c"}));
    }
}