package esprit.pfe.serviceanalyse.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class AnalyticsAuthorizationServiceTest {

    private final AnalyticsAuthorizationService service = new AnalyticsAuthorizationService();

    private JwtAuthenticationToken token(List<String> scope, String subject, String departmentId, List<String> perimeter) {
        Jwt.JwtBuilder b = Jwt.withTokenValue("t")
                .header("alg", "HS512")
                .subject(subject)
                .claim("scope", scope);
        if (departmentId != null) b.claim("department_id", departmentId);
        if (perimeter != null) b.claim("cup_perimeter", perimeter);
        Jwt jwt = b.build();
        return new JwtAuthenticationToken(jwt, scope.stream().map(SimpleGrantedAuthority::new).toList());
    }

    @Test
    void adminFullAccess() {
        var auth = token(List.of("ADMIN"), "anyone", null, null);
        assertDoesNotThrow(() -> service.authorizeTeacherAccess(auth, "T9", "D9"));
        assertDoesNotThrow(() -> service.authorizeDepartment(auth, "D9"));
    }

    @Test
    void teacherOnlySelf() {
        var auth = token(List.of("TEACHER"), "T1", "D1", null);
        assertDoesNotThrow(() -> service.authorizeTeacherAccess(auth, "T1", "D1"));
        assertThrows(AccessDeniedException.class, () -> service.authorizeTeacherAccess(auth, "T2", "D1"));
    }

    @Test
    void deptManagerOnlyOwnDepartment() {
        var auth = token(List.of("DEPARTMENT_MANAGER"), "mgr", "D1", null);
        assertDoesNotThrow(() -> service.authorizeTeacherAccess(auth, "T1", "D1"));
        assertThrows(AccessDeniedException.class, () -> service.authorizeTeacherAccess(auth, "T1", "D2"));
        assertDoesNotThrow(() -> service.authorizeDepartment(auth, "D1"));
        assertThrows(AccessDeniedException.class, () -> service.authorizeDepartment(auth, "D2"));
    }

    @Test
    void cupOnlyWithinPerimeter() {
        var auth = token(List.of("CUP"), "cup", null, List.of("D1", "D2"));
        assertDoesNotThrow(() -> service.authorizeTeacherAccess(auth, "T1", "D1"));
        assertThrows(AccessDeniedException.class, () -> service.authorizeTeacherAccess(auth, "T1", "D3"));
    }

    @Test
    void unknownRoleDenied() {
        var auth = token(List.of("GUEST"), "g", null, null);
        assertThrows(AccessDeniedException.class, () -> service.authorizeDepartment(auth, null));
    }
}
