package esprit.d2f.common.security;

public final class AuthorizationMatrix {

    private AuthorizationMatrix() { throw new UnsupportedOperationException("Utility class"); }

    public static final String COMPETENCE_READ = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F','ROLE_ENSEIGNANT','ROLE_CHEF_DEPARTEMENT')";
    public static final String COMPETENCE_CREATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String COMPETENCE_UPDATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String COMPETENCE_DELETE = "hasAnyRole('ROLE_ADMIN')";
    public static final String COMPETENCE_ASSIGN = "hasAnyRole('ROLE_ADMIN')";

    public static final String AFFECTATION_READ = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F')";
    public static final String AFFECTATION_CREATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String AFFECTATION_UPDATE_SELF = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F','ROLE_ENSEIGNANT')";
    public static final String AFFECTATION_UPDATE_ALL = "hasAnyRole('ROLE_ADMIN')";
    public static final String AFFECTATION_DELETE = "hasAnyRole('ROLE_ADMIN')";

    public static final String BESOIN_FORMATION_READ_ALL = "hasAnyRole('ROLE_ADMIN','ROLE_CHEF_DEPARTEMENT')";
    public static final String BESOIN_FORMATION_READ_CUP = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F')";
    public static final String BESOIN_FORMATION_READ_ENSEIGNANT = "hasAnyRole('ROLE_ADMIN','ROLE_ENSEIGNANT')";
    public static final String BESOIN_FORMATION_CREATE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F','ROLE_ENSEIGNANT')";
    public static final String BESOIN_FORMATION_UPDATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String BESOIN_FORMATION_DELETE = "hasAnyRole('ROLE_ADMIN')";
    public static final String BESOIN_FORMATION_APPROVE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F','ROLE_CHEF_DEPARTEMENT')";

    public static final String FORMATION_READ = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F','ROLE_ENSEIGNANT','ROLE_FORMATEUR','ROLE_RESPONSABLE_DOSSIER','ROLE_CHEF_DEPARTEMENT')";
    public static final String FORMATION_CREATE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F')";
    public static final String FORMATION_UPDATE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F','ROLE_RESPONSABLE_DOSSIER')";
    public static final String FORMATION_DELETE = "hasAnyRole('ROLE_ADMIN')";
    public static final String FORMATION_APPROVE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F')";
    public static final String FORMATION_READ_OWN = "hasAnyRole('ROLE_ADMIN','ROLE_FORMATEUR')";

    public static final String EVALUATION_READ_ALL = "hasAnyRole('ROLE_ADMIN','ROLE_CHEF_DEPARTEMENT')";
    public static final String EVALUATION_READ_CUP = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F')";
    public static final String EVALUATION_READ_ENSEIGNANT = "hasAnyRole('ROLE_ADMIN','ROLE_ENSEIGNANT')";
    public static final String EVALUATION_READ_FORMATEUR = "hasAnyRole('ROLE_ADMIN','ROLE_FORMATEUR')";
    public static final String EVALUATION_CREATE = "hasAnyRole('ROLE_ADMIN','ROLE_FORMATEUR')";
    public static final String EVALUATION_UPDATE = "hasAnyRole('ROLE_ADMIN','ROLE_FORMATEUR')";
    public static final String EVALUATION_DELETE = "hasAnyRole('ROLE_ADMIN')";
    public static final String EVALUATION_MARK_ENTRY = "hasAnyRole('ROLE_ADMIN','ROLE_FORMATEUR')";

    public static final String CERTIFICAT_READ = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F','ROLE_ENSEIGNANT','ROLE_FORMATEUR')";
    public static final String CERTIFICAT_CREATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String CERTIFICAT_UPDATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String CERTIFICAT_DELETE = "hasAnyRole('ROLE_ADMIN')";

    public static final String RICE_READ = "hasAnyRole('ROLE_ADMIN')";
    public static final String RICE_CREATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String RICE_UPDATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String RICE_DELETE = "hasAnyRole('ROLE_ADMIN')";

    public static final String DASHBOARD_ADMIN_FULL = "hasAnyRole('ROLE_ADMIN')";
    public static final String DASHBOARD_ADMIN_LIMITED = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F','ROLE_CHEF_DEPARTEMENT')";

    public static final String ACCOUNT_READ = "hasAnyRole('ROLE_ADMIN')";
    public static final String ACCOUNT_CREATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String ACCOUNT_UPDATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String ACCOUNT_DELETE = "hasAnyRole('ROLE_ADMIN')";
    public static final String ACCOUNT_BAN = "hasAnyRole('ROLE_ADMIN')";
    public static final String ACCOUNT_VIEW_PROFILE = "isAuthenticated()";
    public static final String ACCOUNT_EDIT_OWN = "isAuthenticated()";

    // ── Skill Passport ──────────────────────────────────────────────────
    // Un enseignant voit son propre passeport ; admin/CUP/D2F voient tous.
    // Le contrôle fin (enseignant = soi-même) est assuré applicativement
    // dans SkillPassportAuthorizationService.
    public static final String SKILL_PASSPORT_READ_OWN =
            "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F','ROLE_ENSEIGNANT')";
    public static final String SKILL_PASSPORT_READ_ALL =
            "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F')";

    // ── Bureau ──────────────────────────────────────────────────────────
    public static final String BUREAU_READ   = "hasAnyRole('ROLE_ADMIN')";
    public static final String BUREAU_CREATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String BUREAU_UPDATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String BUREAU_DELETE = "hasAnyRole('ROLE_ADMIN')";

    // ── Référentiel (Dept, UP, Enseignant) ─────────────────────────────
    public static final String REFERENTIEL_READ   = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F','ROLE_ENSEIGNANT','ROLE_CHEF_DEPARTEMENT','ROLE_FORMATEUR','ROLE_RESPONSABLE_DOSSIER')";
    public static final String REFERENTIEL_WRITE  = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F')";
    public static final String REFERENTIEL_IMPORT = "hasAnyRole('ROLE_ADMIN')";

    // ── Formation-Compétence (liaison) ──────────────────────────────────
    public static final String FORMATION_COMPETENCE_READ =
            "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F','ROLE_ENSEIGNANT','ROLE_FORMATEUR','ROLE_CHEF_DEPARTEMENT')";
    public static final String FORMATION_COMPETENCE_CREATE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F')";
    public static final String FORMATION_COMPETENCE_UPDATE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F','ROLE_RESPONSABLE_DOSSIER')";
    public static final String FORMATION_COMPETENCE_DELETE = "hasAnyRole('ROLE_ADMIN')";

    // ── Inscription ─────────────────────────────────────────────────────
    public static final String INSCRIPTION_READ    = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F','ROLE_ENSEIGNANT','ROLE_FORMATEUR')";
    public static final String INSCRIPTION_CREATE  = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F','ROLE_ENSEIGNANT')";
    public static final String INSCRIPTION_APPROVE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F')";

    public static final String GATEWAY_ACCESS = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F','ROLE_ENSEIGNANT','ROLE_FORMATEUR','ROLE_CHEF_DEPARTEMENT','ROLE_RESPONSABLE_DOSSIER')";
    public static final String PUBLIC_ACCESS = "permitAll()";
}
