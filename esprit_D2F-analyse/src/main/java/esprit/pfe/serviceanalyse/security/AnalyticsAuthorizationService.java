package esprit.pfe.serviceanalyse.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Object-level (BOLA/IDOR) authorization for analytics, mirroring the FastAPI V2
 * rules:
 * <ul>
 *   <li>ADMIN → full access</li>
 *   <li>TEACHER → own profile only</li>
 *   <li>DEPARTMENT_MANAGER → own department only</li>
 *   <li>CUP → assigned perimeter (list of department ids) only</li>
 * </ul>
 */
@Component
public class AnalyticsAuthorizationService {

    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ROLE_TEACHER = "TEACHER";
    private static final String ROLE_DEPT_MANAGER = "DEPARTMENT_MANAGER";
    private static final String ROLE_CUP = "CUP";

    public void authorizeTeacherAccess(Authentication auth, String teacherId, String teacherDepartmentId) {
        Jwt jwt = jwt(auth);
        if (hasRole(jwt, ROLE_ADMIN)) {
            return;
        }
        String subject = jwt.getSubject();
        if (hasRole(jwt, ROLE_TEACHER)) {
            if (!subject.equals(teacherId)) {
                throw new AccessDeniedException("Accès limité à votre propre profil.");
            }
            return;
        }
        if (hasRole(jwt, ROLE_DEPT_MANAGER)) {
            String dept = jwt.getClaimAsString("department_id");
            if (teacherDepartmentId == null || !teacherDepartmentId.equals(dept)) {
                throw new AccessDeniedException("Accès limité à votre département.");
            }
            return;
        }
        if (hasRole(jwt, ROLE_CUP)) {
            List<String> perimeter = jwt.getClaimAsStringList("cup_perimeter");
            if (teacherDepartmentId == null || perimeter == null || !perimeter.contains(teacherDepartmentId)) {
                throw new AccessDeniedException("Enseignant hors de votre périmètre CUP.");
            }
            return;
        }
        throw new AccessDeniedException("Accès non autorisé.");
    }

    public void authorizeDepartment(Authentication auth, String departmentId) {
        Jwt jwt = jwt(auth);
        if (hasRole(jwt, ROLE_ADMIN)) {
            return;
        }
        if (departmentId == null) {
            if (hasRole(jwt, ROLE_TEACHER)) {
                throw new AccessDeniedException("Filtre département requis pour votre rôle.");
            }
            throw new AccessDeniedException("Accès non autorisé.");
        }
        if (hasRole(jwt, ROLE_TEACHER)) {
            throw new AccessDeniedException("Accès limité à votre propre profil.");
        }
        if (hasRole(jwt, ROLE_DEPT_MANAGER)) {
            String dept = jwt.getClaimAsString("department_id");
            if (!departmentId.equals(dept)) {
                throw new AccessDeniedException("Accès limité à votre département.");
            }
            return;
        }
        if (hasRole(jwt, ROLE_CUP)) {
            List<String> perimeter = jwt.getClaimAsStringList("cup_perimeter");
            if (perimeter == null || !perimeter.contains(departmentId)) {
                throw new AccessDeniedException("Département hors de votre périmètre CUP.");
            }
            return;
        }
        throw new AccessDeniedException("Accès non autorisé.");
    }

    private boolean hasRole(Jwt jwt, String role) {
        return jwt.getClaimAsStringList("scope").stream()
                .anyMatch(r -> r.equalsIgnoreCase(role) || r.equalsIgnoreCase("ROLE_" + role));
    }

    private Jwt jwt(Authentication auth) {
        if (auth instanceof JwtAuthenticationToken token) {
            return token.getToken();
        }
        throw new AccessDeniedException("Principal JWT attendu.");
    }
}
