import { useAuth } from "@/hooks/auth/useAuth";
import ExecutiveDashboard from "./ExecutiveDashboard";
import PersonalDashboard from "./PersonalDashboard";

/** Normalise un rôle quelconque (ROLE_ADMIN, "CUP", "Chef_Departement"…) en clé courte. */
function normalizeRole(v: unknown): string {
  return String(v ?? "").toLowerCase().replace(/^role_?/, "").replaceAll(/[\s_-]+/g, "");
}

/**
 * Tableau de bord principal (landing /home), adapté au rôle de l'utilisateur :
 *  - ADMIN  → vue exécutive globale
 *  - CUP / Chef de département → vue exécutive scopée (endpoints scopés serveur)
 *  - ENSEIGNANT / ANIMATEUR → vue personnelle (scaffold)
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);

  if (role === "admin") return <ExecutiveDashboard role="admin" />;
  if (role === "cup" || role.startsWith("chef")) return <ExecutiveDashboard role="cup" />;
  if (role === "animateur" || role === "formateur") return <PersonalDashboard role="animateur" />;
  return <PersonalDashboard role="enseignant" />;
}
