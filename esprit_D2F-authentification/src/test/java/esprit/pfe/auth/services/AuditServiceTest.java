package esprit.pfe.auth.services;

import esprit.pfe.auth.entities.AuditLog;
import esprit.pfe.auth.repositories.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuditService Tests")
class AuditServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    private AuditService auditService;

    @BeforeEach
    void setUp() {
        auditService = new AuditService(auditLogRepository);
    }

    @Test
    @DisplayName("logLogin - should save login audit log with correct properties")
    void testLogLogin() {
        auditService.logLogin("user1", "127.0.0.1");
        verify(auditLogRepository).save(argThat(log ->
                log.getUsername().equals("user1") &&
                log.getAction().equals("LOGIN") &&
                log.getStatus().equals("SUCCESS") &&
                log.getIpAddress().equals("127.0.0.1") &&
                log.getResource().equals("Authentication")
        ));
    }

    @Test
    @DisplayName("logFailedLogin - should save failed login audit log with reason")
    void testLogFailedLogin() {
        auditService.logFailedLogin("user1", "127.0.0.1", "Wrong password");
        verify(auditLogRepository).save(argThat(log ->
                log.getUsername().equals("user1") &&
                log.getAction().equals("LOGIN_FAILED") &&
                log.getStatus().equals("FAILED") &&
                log.getDetails().equals("Wrong password") &&
                log.getIpAddress().equals("127.0.0.1")
        ));
    }

    @Test
    @DisplayName("logLogout - should save logout audit log")
    void testLogLogout() {
        auditService.logLogout("user1", "127.0.0.1");
        verify(auditLogRepository).save(argThat(log ->
                log.getUsername().equals("user1") &&
                log.getAction().equals("LOGOUT") &&
                log.getStatus().equals("SUCCESS") &&
                log.getIpAddress().equals("127.0.0.1")
        ));
    }

    @Test
    @DisplayName("logAccountModification - should save account modification audit log")
    void testLogAccountModification() {
        auditService.logAccountModification("admin", "user1", "UPDATE", "Change email");
        verify(auditLogRepository).save(argThat(log ->
                log.getUsername().equals("admin") &&
                log.getAction().equals("UPDATE") &&
                log.getResource().contains("user1") &&
                log.getDetails().equals("Change email") &&
                log.getStatus().equals("SUCCESS")
        ));
    }

    @Test
    @DisplayName("logUnauthorizedAccess - should save unauthorized access audit log")
    void testLogUnauthorizedAccess() {
        auditService.logUnauthorizedAccess("user1", "ADMIN_PAGE", "127.0.0.1");
        verify(auditLogRepository).save(argThat(log ->
                log.getUsername().equals("user1") &&
                log.getAction().equals("UNAUTHORIZED_ACCESS") &&
                log.getResource().equals("ADMIN_PAGE") &&
                log.getStatus().equals("DENIED") &&
                log.getIpAddress().equals("127.0.0.1")
        ));
    }

    @Test
    @DisplayName("logCrudOperation - CREATE operation")
    void testLogCrudOperation() {
        auditService.logCrudOperation("admin", "CREATE", "Domain", "101", "Add domain");
        verify(auditLogRepository).save(argThat(log ->
                log.getUsername().equals("admin") &&
                log.getAction().equals("CREATE") &&
                log.getResource().contains("Domain") &&
                log.getResource().contains("101") &&
                log.getDetails().equals("Add domain") &&
                log.getStatus().equals("SUCCESS")
        ));
    }

    @Test
    void testGetUserAuditLogs() {
        when(auditLogRepository.findByUsername("user1")).thenReturn(List.of(new AuditLog()));
        List<AuditLog> logs = auditService.getUserAuditLogs("user1");
        assertEquals(1, logs.size());
        verify(auditLogRepository).findByUsername("user1");
    }

    @Test
    void testGetResourceAuditLogs() {
        when(auditLogRepository.findByResource("Auth")).thenReturn(List.of(new AuditLog()));
        List<AuditLog> logs = auditService.getResourceAuditLogs("Auth");
        assertEquals(1, logs.size());
        verify(auditLogRepository).findByResource("Auth");
    }

    @Test
    void testGetAllAuditLogs() {
        when(auditLogRepository.findAll()).thenReturn(List.of(new AuditLog()));
        List<AuditLog> logs = auditService.getAllAuditLogs();
        assertEquals(1, logs.size());
        verify(auditLogRepository).findAll();
    }

    @Test
    void testGetAuditLogsBetweenDates() {
        LocalDateTime start = LocalDateTime.now().minusDays(1);
        LocalDateTime end = LocalDateTime.now();
        when(auditLogRepository.findByTimestampBetween(any(), any())).thenReturn(List.of(new AuditLog()));
        List<AuditLog> logs = auditService.getAuditLogsBetweenDates(start, end);
        assertEquals(1, logs.size());
        verify(auditLogRepository).findByTimestampBetween(start, end);
    }

    @Test
    @DisplayName("logPasswordResetRequest - should save password reset request audit log")
    void testLogPasswordResetRequest() {
        auditService.logPasswordResetRequest("user@example.com", "192.168.1.1");
        verify(auditLogRepository).save(argThat(log ->
                log.getUsername().equals("user@example.com") &&
                log.getAction().equals("PASSWORD_RESET_REQUEST") &&
                log.getResource().equals("Authentication") &&
                log.getStatus().equals("SUCCESS") &&
                log.getIpAddress().equals("192.168.1.1")
        ));
    }

    @Test
    @DisplayName("logPasswordResetSuccess - should save password reset success audit log")
    void testLogPasswordResetSuccess() {
        auditService.logPasswordResetSuccess("testuser", "192.168.1.1");
        verify(auditLogRepository).save(argThat(log ->
                log.getUsername().equals("testuser") &&
                log.getAction().equals("PASSWORD_RESET_SUCCESS") &&
                log.getResource().equals("Authentication") &&
                log.getStatus().equals("SUCCESS") &&
                log.getIpAddress().equals("192.168.1.1")
        ));
    }

    @Test
    @DisplayName("logAccountBan - should save account ban audit log")
    void testLogAccountBan() {
        auditService.logAccountBan("admin", "banneduser", "192.168.1.1");
        verify(auditLogRepository).save(argThat(log ->
                log.getUsername().equals("admin") &&
                log.getAction().equals("ACCOUNT_BAN") &&
                log.getResource().contains("banneduser") &&
                log.getStatus().equals("SUCCESS") &&
                log.getDetails().contains("admin") &&
                log.getIpAddress().equals("192.168.1.1")
        ));
    }

    @Test
    @DisplayName("logAccountEnable - should save account enable audit log")
    void testLogAccountEnable() {
        auditService.logAccountEnable("admin", "enableduser", "192.168.1.1");
        verify(auditLogRepository).save(argThat(log ->
                log.getUsername().equals("admin") &&
                log.getAction().equals("ACCOUNT_ENABLE") &&
                log.getResource().contains("enableduser") &&
                log.getStatus().equals("SUCCESS") &&
                log.getDetails().contains("admin") &&
                log.getIpAddress().equals("192.168.1.1")
        ));
    }

    @Test
    @DisplayName("getUserAuditLogs - should return empty list when no logs found")
    void testGetUserAuditLogs_EmptyResult() {
        when(auditLogRepository.findByUsername("nonexistent")).thenReturn(List.of());
        List<AuditLog> logs = auditService.getUserAuditLogs("nonexistent");
        assertThat(logs).isEmpty();
    }

    @Test
    @DisplayName("getResourceAuditLogs - should return empty list when no logs found")
    void testGetResourceAuditLogs_EmptyResult() {
        when(auditLogRepository.findByResource("NonexistentResource")).thenReturn(List.of());
        List<AuditLog> logs = auditService.getResourceAuditLogs("NonexistentResource");
        assertThat(logs).isEmpty();
    }

    @Test
    @DisplayName("getAllAuditLogs - should return empty list when no logs exist")
    void testGetAllAuditLogs_EmptyResult() {
        when(auditLogRepository.findAll()).thenReturn(List.of());
        List<AuditLog> logs = auditService.getAllAuditLogs();
        assertThat(logs).isEmpty();
    }

    @Test
    @DisplayName("logCrudOperation - DELETE operation")
    void testLogCrudOperation_DeleteOperation() {
        auditService.logCrudOperation("admin", "DELETE", "User", "USR123", "Deleted user account");
        verify(auditLogRepository).save(argThat(log ->
                log.getAction().equals("DELETE") &&
                log.getResource().contains("USR123")
        ));
    }
}
