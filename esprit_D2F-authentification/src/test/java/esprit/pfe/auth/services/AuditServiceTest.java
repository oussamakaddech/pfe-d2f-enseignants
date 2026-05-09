package esprit.pfe.auth.services;

import esprit.pfe.auth.entities.AuditLog;
import esprit.pfe.auth.repositories.AuditLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private AuditService auditService;

    @Test
    void testLogLogin() {
        auditService.logLogin("user1", "127.0.0.1");
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    void testLogFailedLogin() {
        auditService.logFailedLogin("user1", "127.0.0.1", "Wrong password");
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    void testLogLogout() {
        auditService.logLogout("user1", "127.0.0.1");
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    void testLogAccountModification() {
        auditService.logAccountModification("admin", "user1", "UPDATE", "Change email");
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    void testLogUnauthorizedAccess() {
        auditService.logUnauthorizedAccess("user1", "ADMIN_PAGE", "127.0.0.1");
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    void testLogCrudOperation() {
        auditService.logCrudOperation("admin", "CREATE", "Domain", "101", "Add domain");
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    void testGetUserAuditLogs() {
        when(auditLogRepository.findByUsername("user1")).thenReturn(List.of(new AuditLog()));
        List<AuditLog> logs = auditService.getUserAuditLogs("user1");
        assertEquals(1, logs.size());
    }

    @Test
    void testGetResourceAuditLogs() {
        when(auditLogRepository.findByResource("Auth")).thenReturn(List.of(new AuditLog()));
        List<AuditLog> logs = auditService.getResourceAuditLogs("Auth");
        assertEquals(1, logs.size());
    }

    @Test
    void testGetAllAuditLogs() {
        when(auditLogRepository.findAll()).thenReturn(List.of(new AuditLog()));
        List<AuditLog> logs = auditService.getAllAuditLogs();
        assertEquals(1, logs.size());
    }

    @Test
    void testGetAuditLogsBetweenDates() {
        LocalDateTime start = LocalDateTime.now().minusDays(1);
        LocalDateTime end = LocalDateTime.now();
        when(auditLogRepository.findByTimestampBetween(any(), any())).thenReturn(List.of(new AuditLog()));
        List<AuditLog> logs = auditService.getAuditLogsBetweenDates(start, end);
        assertEquals(1, logs.size());
    }
}
