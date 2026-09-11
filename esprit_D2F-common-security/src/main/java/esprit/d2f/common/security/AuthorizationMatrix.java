package esprit.d2f.common.security;

public final class AuthorizationMatrix {

    private AuthorizationMatrix() { throw new UnsupportedOperationException("Utility class"); }

    public static final String COMPETENCE_READ = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_ENSEIGNANT','ROLE_CHEF_DEPARTEMENT')";
    public static final String COMPETENCE_CREATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String COMPETENCE_UPDATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String COMPETENCE_DELETE = "hasAnyRole('ROLE_ADMIN')";
    public static final String COMPETENCE_ASSIGN = "hasAnyRole('ROLE_ADMIN')";

    public static final String AFFECTATION_READ = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_ENSEIGNANT','ROLE_CHEF_DEPARTEMENT')";
    public static final String AFFECTATION_CREATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String AFFECTATION_UPDATE_SELF = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_ENSEIGNANT')";
    public static final String AFFECTATION_UPDATE_ALL = "hasAnyRole('ROLE_ADMIN')";
    public static final String AFFECTATION_DELETE = "hasAnyRole('ROLE_ADMIN')";

    public static final String BESOIN_FORMATION_READ_ALL = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_CHEF_DEPARTEMENT','ROLE_ANIMATEUR','ROLE_RESPONSABLE_DOSSIER')";
    public static final String BESOIN_FORMATION_READ_CUP = "hasAnyRole('ROLE_ADMIN','ROLE_CUP')";
    public static final String BESOIN_FORMATION_READ_ENSEIGNANT = "hasAnyRole('ROLE_ADMIN','ROLE_ENSEIGNANT')";
    // ANIMATEUR inclus : un animateur interne est aussi un enseignant et peut donc
    // exprimer un besoin de formation (symétrique d'INSCRIPTION_CREATE).
    public static final String BESOIN_FORMATION_CREATE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_ENSEIGNANT','ROLE_ANIMATEUR','ROLE_CHEF_DEPARTEMENT')";
    public static final String BESOIN_FORMATION_UPDATE = "hasAnyRole('ROLE_ADMIN','ROLE_ENSEIGNANT','ROLE_ANIMATEUR')";
    public static final String BESOIN_FORMATION_DELETE = "hasAnyRole('ROLE_ADMIN','ROLE_ENSEIGNANT','ROLE_ANIMATEUR')";
    public static final String BESOIN_FORMATION_APPROVE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_CHEF_DEPARTEMENT')";
    // Workflow sécurisé : refus / annulation / périmètres.
    // Le contrôle fin (étape, périmètre UP/département, créateur ≠ décideur)
    // est appliqué applicativement dans BesoinFormationServiceImpl.
    public static final String BESOIN_FORMATION_REJECT = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_CHEF_DEPARTEMENT')";
    public static final String BESOIN_FORMATION_CANCEL = "isAuthenticated()";
    public static final String BESOIN_FORMATION_PENDING = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_CHEF_DEPARTEMENT')";
    public static final String BESOIN_FORMATION_SCOPE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_CHEF_DEPARTEMENT')";
    public static final String BESOIN_FORMATION_HISTORY = "hasAnyRole('ROLE_ADMIN')";
    public static final String BESOIN_FORMATION_REVIEWER_SCOPE = "hasAnyRole('ROLE_ADMIN')";

    public static final String FORMATION_READ = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_ENSEIGNANT','ROLE_FORMATEUR','ROLE_ANIMATEUR','ROLE_RESPONSABLE_DOSSIER','ROLE_CHEF_DEPARTEMENT')";
    public static final String FORMATION_CREATE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP')";
    public static final String FORMATION_UPDATE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_RESPONSABLE_DOSSIER')";
    public static final String FORMATION_DELETE = "hasAnyRole('ROLE_ADMIN')";
    public static final String FORMATION_APPROVE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP')";
    public static final String FORMATION_READ_OWN = "hasAnyRole('ROLE_ADMIN','ROLE_FORMATEUR','ROLE_ANIMATEUR','ROLE_ENSEIGNANT')";
    // Marquage des présences d'une séance : l'animateur/formateur de la séance (et,
    // par symétrie métier, l'enseignant-animateur interne) saisit la feuille de
    // présence ; les rôles de gestion (ADMIN/CUP/RESPONSABLE_DOSSIER) conservent
    // l'accès hérité de FORMATION_UPDATE. Le contrôle fin (appartenance à la séance)
    // est assuré applicativement dans FormationWorkflowService.
    public static final String PRESENCE_MARK =
            "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_RESPONSABLE_DOSSIER','ROLE_FORMATEUR','ROLE_ANIMATEUR','ROLE_ENSEIGNANT')";

    // ── Documents de formation ─────────────────────────────────────────
    // Périmètre RESPONSABLE_DOSSIER : CRUD docs + consultation formations.
    // Lecture = même périmètre que FORMATION_READ (consultation).
    // Create/Update/Delete = ADMIN + CUP + RESPONSABLE_DOSSIER (gestion dossier).
    public static final String DOCUMENT_READ   = FORMATION_READ;
    public static final String DOCUMENT_CREATE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_RESPONSABLE_DOSSIER')";
    public static final String DOCUMENT_UPDATE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_RESPONSABLE_DOSSIER')";
    public static final String DOCUMENT_DELETE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_RESPONSABLE_DOSSIER')";

    // Parité UI /home/Evaluations (RoleGuard) : CUP et ANIMATEUR consultent aussi
    // les évaluations (CREATE/READ_FORMATION les incluent déjà).
    public static final String EVALUATION_READ_ALL = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_CHEF_DEPARTEMENT','ROLE_ENSEIGNANT','ROLE_ANIMATEUR')";
    // Lecture des évaluations dans un périmètre formation : l'animateur/formateur
    // qui anime une formation doit pouvoir consulter ses évaluations.
    public static final String EVALUATION_READ_FORMATION =
            "hasAnyRole('ROLE_ADMIN','ROLE_CHEF_DEPARTEMENT','ROLE_ENSEIGNANT','ROLE_FORMATEUR','ROLE_ANIMATEUR')";
    public static final String EVALUATION_READ_CUP = "hasAnyRole('ROLE_ADMIN','ROLE_CUP')";
    public static final String EVALUATION_READ_ENSEIGNANT = "hasAnyRole('ROLE_ADMIN','ROLE_ENSEIGNANT')";
    public static final String EVALUATION_READ_FORMATEUR = "hasAnyRole('ROLE_ADMIN','ROLE_FORMATEUR','ROLE_ANIMATEUR')";
    public static final String EVALUATION_CREATE = "hasAnyRole('ROLE_ADMIN','ROLE_FORMATEUR','ROLE_ANIMATEUR','ROLE_ENSEIGNANT')";
    public static final String EVALUATION_UPDATE = "hasAnyRole('ROLE_ADMIN','ROLE_FORMATEUR','ROLE_ANIMATEUR','ROLE_ENSEIGNANT')";
    public static final String EVALUATION_DELETE = "hasAnyRole('ROLE_ADMIN')";
    public static final String EVALUATION_MARK_ENTRY = "hasAnyRole('ROLE_ADMIN','ROLE_FORMATEUR','ROLE_ANIMATEUR')";

    public static final String CERTIFICAT_READ = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_ENSEIGNANT','ROLE_FORMATEUR','ROLE_ANIMATEUR','ROLE_CHEF_DEPARTEMENT','ROLE_RESPONSABLE_DOSSIER')";
    public static final String CERTIFICAT_CREATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String CERTIFICAT_UPDATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String CERTIFICAT_DELETE = "hasAnyRole('ROLE_ADMIN')";

    public static final String RICE_READ = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_CHEF_DEPARTEMENT')";
    public static final String RICE_CREATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String RICE_UPDATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String RICE_DELETE = "hasAnyRole('ROLE_ADMIN')";

    public static final String DASHBOARD_ADMIN_FULL = "hasAnyRole('ROLE_ADMIN')";
    /** Dashboard (lecture KPI) : ADMIN + CUP + Chef de département + Animateur + Responsable dossier.
     *  Parité AuthorizationMatrix.DASHBOARD_ADMIN_LIMITED — le dashboard /home affiche
     *  les KPIs formation pour RESPONSABLE_DOSSIER (l'analyse prédictive reste pilotage). */
    public static final String DASHBOARD_ADMIN_LIMITED = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_CHEF_DEPARTEMENT','ROLE_ANIMATEUR','ROLE_RESPONSABLE_DOSSIER')";

    public static final String ACCOUNT_READ = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_ANIMATEUR','ROLE_CHEF_DEPARTEMENT')";
    public static final String ACCOUNT_CREATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String ACCOUNT_UPDATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String ACCOUNT_DELETE = "hasAnyRole('ROLE_ADMIN')";
    public static final String ACCOUNT_BAN = "hasAnyRole('ROLE_ADMIN')";
    public static final String ACCOUNT_VIEW_PROFILE = "isAuthenticated()";
    public static final String ACCOUNT_EDIT_OWN = "isAuthenticated()";

    // ── Skill Passport ──────────────────────────────────────────────────
    // Tout utilisateur authentifié voit SON propre passeport (parité
    // ANIMATEUR/FORMATEUR ≡ ENSEIGNANT) ; admin/CUP voient tous.
    // Le contrôle fin (cible = soi-même) est assuré applicativement
    // dans SkillPassportAuthorizationService.
    public static final String SKILL_PASSPORT_READ_OWN =
            "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_ENSEIGNANT','ROLE_ANIMATEUR','ROLE_FORMATEUR','ROLE_CHEF_DEPARTEMENT','ROLE_RESPONSABLE_DOSSIER')";
    public static final String SKILL_PASSPORT_READ_ALL =
            "hasAnyRole('ROLE_ADMIN','ROLE_CUP')";

    // ── Bureau ──────────────────────────────────────────────────────────
    public static final String BUREAU_READ   = "hasAnyRole('ROLE_ADMIN')";
    public static final String BUREAU_CREATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String BUREAU_UPDATE = "hasAnyRole('ROLE_ADMIN')";
    public static final String BUREAU_DELETE = "hasAnyRole('ROLE_ADMIN')";

    // ── Animateur externe (rattaché à un bureau) ────────────────────────
    // Sélection + ajout à la volée lors de la création d'une formation externe :
    // accessible aux mêmes rôles qui créent les formations, pas seulement admin.
    public static final String ANIMATEUR_EXTERNE_READ   = "hasAnyRole('ROLE_ADMIN','ROLE_CUP')";
    public static final String ANIMATEUR_EXTERNE_CREATE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP')";
    public static final String ANIMATEUR_EXTERNE_UPDATE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP')";
    public static final String ANIMATEUR_EXTERNE_DELETE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP')";

    // ── Référentiel (Dept, UP, Enseignant) ─────────────────────────────
    public static final String REFERENTIEL_READ   = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_ENSEIGNANT','ROLE_CHEF_DEPARTEMENT','ROLE_FORMATEUR','ROLE_ANIMATEUR','ROLE_RESPONSABLE_DOSSIER')";
    public static final String REFERENTIEL_WRITE  = "hasAnyRole('ROLE_ADMIN','ROLE_CUP')";
    public static final String REFERENTIEL_IMPORT = "hasAnyRole('ROLE_ADMIN')";

    // ── Formation-Compétence (liaison) ──────────────────────────────────
    public static final String FORMATION_COMPETENCE_READ =
            "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_ENSEIGNANT','ROLE_FORMATEUR','ROLE_ANIMATEUR','ROLE_CHEF_DEPARTEMENT')";
    public static final String FORMATION_COMPETENCE_CREATE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP')";
    public static final String FORMATION_COMPETENCE_UPDATE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_RESPONSABLE_DOSSIER')";
    public static final String FORMATION_COMPETENCE_DELETE = "hasAnyRole('ROLE_ADMIN')";

    // ── Inscription ─────────────────────────────────────────────────────
    public static final String INSCRIPTION_READ    = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_ENSEIGNANT','ROLE_FORMATEUR','ROLE_ANIMATEUR','ROLE_CHEF_DEPARTEMENT')";
    // ANIMATEUR/FORMATEUR inclus : un animateur interne est aussi un enseignant et
    // peut donc s'inscrire aux formations (symétrique de INSCRIPTION_READ).
    public static final String INSCRIPTION_CREATE  = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_ENSEIGNANT','ROLE_ANIMATEUR','ROLE_FORMATEUR')";
    public static final String INSCRIPTION_APPROVE = "hasAnyRole('ROLE_ADMIN','ROLE_CUP')";

    public static final String GATEWAY_ACCESS = "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_ENSEIGNANT','ROLE_FORMATEUR','ROLE_ANIMATEUR','ROLE_CHEF_DEPARTEMENT','ROLE_RESPONSABLE_DOSSIER')";

    // ── Gestion unifiée (comptes + enseignants) ─────────────────────────
    // Page d'administration unifiée. ENSEIGNANT et ANIMATEUR n'y ont pas accès
    // par défaut. Le périmètre fin (CHEF_DEPARTEMENT = son département,
    // RESPONSABLE_DOSSIER = scope dossier) est appliqué au niveau service (row-level),
    // jamais uniquement côté frontend.
    public static final String UNIFIED_PROFILE_READ =
            "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_CHEF_DEPARTEMENT','ROLE_RESPONSABLE_DOSSIER')";
    public static final String UNIFIED_PROFILE_EXPORT =
            "hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_CHEF_DEPARTEMENT','ROLE_RESPONSABLE_DOSSIER')";

    // ── Résumés de comptes (appel inter-service formation → auth) ───────
    // Autorise l'appel porteur d'un jeton de service (ROLE_SVC_FORMATION) OU un
    // utilisateur disposant déjà de l'accès à la page unifiée.
    public static final String ACCOUNT_SUMMARY_READ =
            "hasAnyRole('ROLE_SVC_FORMATION','ROLE_ADMIN','ROLE_CUP','ROLE_CHEF_DEPARTEMENT','ROLE_RESPONSABLE_DOSSIER')";

    public static final String PUBLIC_ACCESS = "permitAll()";
}
