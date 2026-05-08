package esprit.pfe.auth.services;

import esprit.pfe.auth.entities.AuditLog;
import esprit.pfe.auth.repositories.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private AuditService auditService;

    private final String testUsername = "testuser";
    private final String testIpAddress = "192.168.1.1";

    @BeforeEach
    void setUp() {
        // Reset mocks before each test
        reset(auditLogRepository);
    }

    @Test
    void testLogLogin_Success() {
        // Act
        auditService.logLogin(testUsername, testIpAddress);

        // Assert
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
        verify(auditLogRepository).save(argThat(log -> 
            log.getUsername().equals(testUsername) &&
            log.getAction().equals("LOGIN") &&
            log.getResource().equals("Authentication") &&
            log.getStatus().equals("SUCCESS") &&
            log.getIpAddress().equals(testIpAddress) &&
            log.getTimestamp() != null
        ));
    }

    @Test
    void testLogFailedLogin_Success() {
        // Arrange
        String reason = "Invalid password";

        // Act
        auditService.logFailedLogin(testUsername, testIpAddress, reason);

        // Assert
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
        verify(auditLogRepository).save(argThat(log -> 
            log.getUsername().equals(testUsername) &&
            log.getAction().equals("LOGIN_FAILED") &&
            log.getResource().equals("Authentication") &&
            log.getStatus().equals("FAILED") &&
            log.getDetails().equals(reason) &&
            log.getIpAddress().equals(testIpAddress) &&
            log.getTimestamp() != null
        ));
    }

    @Test
    void testLogLogout_Success() {
        // Act
        auditService.logLogout(testUsername, testIpAddress);

        // Assert
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
        verify(auditLogRepository).save(argThat(log -> 
            log.getUsername().equals(testUsername) &&
            log.getAction().equals("LOGOUT") &&
            log.getResource().equals("Authentication") &&
            log.getStatus().equals("SUCCESS") &&
            log.getIpAddress().equals(testIpAddress) &&
            log.getTimestamp() != null
        ));
    }

    @Test
    void testLogAccountModification_Success() {
        // Arrange
        String actor = "admin";
        String targetUser = "testuser";
        String action = "UPDATE";
        String details = "Updated user profile";

        // Act
        auditService.logAccountModification(actor, targetUser, action, details);

        // Assert
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
        verify(auditLogRepository).save(argThat(log -> 
            log.getUsername().equals(actor) &&
            log.getAction().equals(action) &&
            log.getResource().equals("User: " + targetUser) &&
            log.getStatus().equals("SUCCESS") &&
            log.getDetails().equals(details) &&
            log.getTimestamp() != null
        ));
    }

    @Test
    void testLogUnauthorizedAccess_Success() {
        // Arrange
        String resource = "/api/admin/users";

        // Act
        auditService.logUnauthorizedAccess(testUsername, resource, testIpAddress);

        // Assert
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
        verify(auditLogRepository).save(argThat(log -> 
            log.getUsername().equals(testUsername) &&
            log.getAction().equals("UNAUTHORIZED_ACCESS") &&
            log.getResource().equals(resource) &&
            log.getStatus().equals("DENIED") &&
            log.getIpAddress().equals(testIpAddress) &&
            log.getTimestamp() != null
        ));
    }

    @Test
    void testLogCrudOperation_Success() {
        // Arrange
        String operation = "create";
        String resource = "User";
        String resourceId = "123";
        String details = "Created new user";

        // Act
        auditService.logCrudOperation(testUsername, operation, resource, resourceId, details);

        // Assert
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
        verify(auditLogRepository).save(argThat(log -> 
            log.getUsername().equals(testUsername) &&
            log.getAction().equals(operation.toUpperCase()) &&
            log.getResource().equals(resource + " (ID: " + resourceId + ")") &&
            log.getStatus().equals("SUCCESS") &&
            log.getDetails().equals(details) &&
            log.getTimestamp() != null
        ));
    }

    @Test
    void testGetUserAuditLogs_Success() {
        // Arrange
        AuditLog log1 = AuditLog.builder()
                .username(testUsername)
                .action("LOGIN")
                .resource("Authentication")
                .status("SUCCESS")
                .timestamp(LocalDateTime.now())
                .build();
        AuditLog log2 = AuditLog.builder()
                .username(testUsername)
                .action("LOGOUT")
                .resource("Authentication")
                .status("SUCCESS")
                .timestamp(LocalDateTime.now())
                .build();
        List<AuditLog> expectedLogs = Arrays.asList(log1, log2);

        when(auditLogRepository.findByUsername(testUsername)).thenReturn(expectedLogs);

        // Act
        List<AuditLog> result = auditService.getUserAuditLogs(testUsername);

        // Assert
        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals("LOGIN", result.get(0).getAction());
        assertEquals("LOGOUT", result.get(1).getAction());
        verify(auditLogRepository, times(1)).findByUsername(testUsername);
    }

    @Test
    void testGetResourceAuditLogs_Success() {
        // Arrange
        String resource = "User";
        AuditLog log1 = AuditLog.builder()
                .username("user1")
                .action("CREATE")
                .resource(resource)
                .status("SUCCESS")
                .timestamp(LocalDateTime.now())
                .build();
        AuditLog log2 = AuditLog.builder()
                .username("user2")
                .action("UPDATE")
                .resource(resource)
                .status("SUCCESS")
                .timestamp(LocalDateTime.now())
                .build();
        List<AuditLog> expectedLogs = Arrays.asList(log1, log2);

        when(auditLogRepository.findByResource(resource)).thenReturn(expectedLogs);

        // Act
        List<AuditLog> result = auditService.getResourceAuditLogs(resource);

        // Assert
        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals("CREATE", result.get(0).getAction());
        assertEquals("UPDATE", result.get(1).getAction());
        verify(auditLogRepository, times(1)).findByResource(resource);
    }

    @Test
    void testGetAllAuditLogs_Success() {
        // Arrange
        AuditLog log1 = AuditLog.builder()
                .username("user1")
                .action("LOGIN")
                .resource("Authentication")
                .status("SUCCESS")
                .timestamp(LocalDateTime.now())
                .build();
        AuditLog log2 = AuditLog.builder()
                .username("user2")
                .action("LOGIN")
                .resource("Authentication")
                .status("SUCCESS")
                .timestamp(LocalDateTime.now())
                .build();
        List<AuditLog> expectedLogs = Arrays.asList(log1, log2);

        when(auditLogRepository.findAll()).thenReturn(expectedLogs);

        // Act
        List<AuditLog> result = auditService.getAllAuditLogs();

        // Assert
        assertNotNull(result);
        assertEquals(2, result.size());
        verify(auditLogRepository, times(1)).findAll();
    }

    @Test
    void testGetAuditLogsBetweenDates_Success() {
        // Arrange
        LocalDateTime startDate = LocalDateTime.of(2025, 1, 1, 0, 0);
        LocalDateTime endDate = LocalDateTime.of(2025, 1, 31, 23, 59);

        AuditLog log1 = AuditLog.builder()
                .username("user1")
                .action("LOGIN")
                .resource("Authentication")
                .status("SUCCESS")
                .timestamp(LocalDateTime.of(2025, 1, 15, 10, 30))
                .build();
        AuditLog log2 = AuditLog.builder()
                .username("user2")
                .action("LOGIN")
                .resource("Authentication")
                .status("SUCCESS")
                .timestamp(LocalDateTime.of(2025, 1, 20, 14, 45))
                .build();
        List<AuditLog> expectedLogs = Arrays.asList(log1, log2);

        when(auditLogRepository.findByTimestampBetween(startDate, endDate)).thenReturn(expectedLogs);

        // Act
        List<AuditLog> result = auditService.getAuditLogsBetweenDates(startDate, endDate);

        // Assert
        assertNotNull(result);
        assertEquals(2, result.size());
        verify(auditLogRepository, times(1)).findByTimestampBetween(startDate, endDate);
    }
}
