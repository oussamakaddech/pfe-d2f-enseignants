package esprit.pfe.auth.Security;

/**
 * Authorization Matrix - Defines permission rules for each role across all modules
 * Maps the business requirements to Spring Security SpEL expressions
 * 
 * Consistent with ERole: admin, CUP, Enseignant, Formateur
 */
public class AuthorizationMatrix {

    // ============ COMPETENCE & DOMAIN MANAGEMENT ============
    public static final String COMPETENCE_READ = "hasAnyRole('ROLE_admin','ROLE_ADMIN','ROLE_CUP','ROLE_Enseignant')";
    public static final String COMPETENCE_CREATE = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String COMPETENCE_UPDATE = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String COMPETENCE_DELETE = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String COMPETENCE_ASSIGN = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";

    // ============ AFFECTATION ENSEIGNANTS ============
    public static final String AFFECTATION_READ = "hasAnyRole('ROLE_admin','ROLE_ADMIN','ROLE_CUP')";
    public static final String AFFECTATION_CREATE = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String AFFECTATION_UPDATE_SELF = "hasAnyRole('ROLE_admin','ROLE_ADMIN','ROLE_CUP','ROLE_Enseignant')"; 
    public static final String AFFECTATION_UPDATE_ALL = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String AFFECTATION_DELETE = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";

    // ============ BESOINS EN FORMATION ============
    public static final String BESOIN_FORMATION_READ_ALL = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String BESOIN_FORMATION_READ_CUP = "hasAnyRole('ROLE_admin','ROLE_ADMIN','ROLE_CUP')"; 
    public static final String BESOIN_FORMATION_READ_ENSEIGNANT = "hasAnyRole('ROLE_admin','ROLE_ADMIN','ROLE_Enseignant')"; 
    public static final String BESOIN_FORMATION_CREATE = "hasAnyRole('ROLE_admin','ROLE_ADMIN','ROLE_CUP','ROLE_Enseignant')";
    public static final String BESOIN_FORMATION_UPDATE = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String BESOIN_FORMATION_DELETE = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String BESOIN_FORMATION_APPROVE = "hasAnyRole('ROLE_admin','ROLE_ADMIN','ROLE_CUP')";

    // ============ PLANIFICATION FORMATIONS ============
    public static final String FORMATION_READ = "hasAnyRole('ROLE_admin','ROLE_ADMIN','ROLE_CUP','ROLE_Enseignant','ROLE_Formateur')";
    public static final String FORMATION_CREATE = "hasAnyRole('ROLE_admin','ROLE_ADMIN','ROLE_CUP')";
    public static final String FORMATION_UPDATE = "hasAnyRole('ROLE_admin','ROLE_ADMIN','ROLE_CUP')";
    public static final String FORMATION_DELETE = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String FORMATION_APPROVE = "hasAnyRole('ROLE_admin','ROLE_ADMIN','ROLE_CUP')";
    public static final String FORMATION_READ_OWN = "hasAnyRole('ROLE_Formateur')"; 

    // ============ EVALUATIONS & CERTIFICATS ============
    public static final String EVALUATION_READ_ALL = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String EVALUATION_READ_CUP = "hasAnyRole('ROLE_CUP')"; 
    public static final String EVALUATION_READ_ENSEIGNANT = "hasAnyRole('ROLE_Enseignant')"; 
    public static final String EVALUATION_READ_FORMATEUR = "hasAnyRole('ROLE_Formateur')"; 
    public static final String EVALUATION_CREATE = "hasAnyRole('ROLE_admin','ROLE_ADMIN','ROLE_Formateur')";
    public static final String EVALUATION_UPDATE = "hasAnyRole('ROLE_admin','ROLE_ADMIN','ROLE_Formateur')";
    public static final String EVALUATION_DELETE = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String EVALUATION_MARK_ENTRY = "hasAnyRole('ROLE_Formateur')";

    public static final String CERTIFICAT_READ = "hasAnyRole('ROLE_admin','ROLE_ADMIN','ROLE_CUP','ROLE_Enseignant','ROLE_Formateur')";
    public static final String CERTIFICAT_CREATE = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String CERTIFICAT_UPDATE = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String CERTIFICAT_DELETE = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";

    // ============ RICE MODULE ============
    public static final String RICE_READ = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String RICE_CREATE = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String RICE_UPDATE = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String RICE_DELETE = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";

    // ============ DASHBOARD ADMIN ============
    public static final String DASHBOARD_ADMIN_FULL = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String DASHBOARD_ADMIN_LIMITED = "hasAnyRole('ROLE_CUP')"; 

    // ============ USER MANAGEMENT ============
    public static final String ACCOUNT_READ = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String ACCOUNT_CREATE = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String ACCOUNT_UPDATE = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String ACCOUNT_DELETE = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String ACCOUNT_BAN = "hasAnyRole('ROLE_admin','ROLE_ADMIN')";
    public static final String ACCOUNT_VIEW_PROFILE = "isAuthenticated()"; 
    public static final String ACCOUNT_EDIT_OWN = "isAuthenticated()"; 

    // ============ API GATEWAY ============
    public static final String GATEWAY_ACCESS = "hasAnyRole('ROLE_admin','ROLE_ADMIN','ROLE_CUP','ROLE_Enseignant','ROLE_Formateur')";

    // ============ PUBLIC ENDPOINTS ============
    public static final String PUBLIC_ACCESS = "permitAll()";
}

