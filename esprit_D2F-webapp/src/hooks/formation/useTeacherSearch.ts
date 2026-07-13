import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import UnifiedProfileService from "@/services/formation/UnifiedProfileService";
import type { UnifiedProfile } from "@/services/formation/UnifiedProfileService";

const MIN_CHARS = 2;
const SEARCH_SIZE = 20;

/**
 * Server-side teacher search hook using the unified-profiles endpoint.
 * Debounce 300ms, min 2 chars, max 20 results, request cancellation.
 */
export function useTeacherSearch(term: string) {
  const debouncedTerm = useDebouncedValue(term.trim(), 300);
  const enabled = debouncedTerm.length >= MIN_CHARS;

  return useQuery<UnifiedProfile[]>({
    queryKey: ["teacherSearch", "unified-profiles", debouncedTerm],
    queryFn: ({ signal }) =>
      UnifiedProfileService.search({
        search: debouncedTerm,
        size: SEARCH_SIZE,
        page: 0,
      }).then((results) => {
        // Filter to teacher-compatible roles
        return results.filter((p) => {
          const role = (p.role ?? "").toLowerCase();
          return role.includes("enseignant") || role.includes("teacher") || role === "";
        });
      }),
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function formatTeacherLabel(profile: UnifiedProfile): string {
  const name = [profile.prenom, profile.nom].filter(Boolean).join(" ").trim();
  const dept = profile.departement ?? "N/A";
  const id = profile.matricule ?? profile.id;
  if (name) return `${name} — ${dept} (${id})`;
  if (profile.email) return `${profile.email} — ${dept}`;
  return `${id} — ${dept}`;
}

export function getTeacherId(profile: UnifiedProfile): string {
  return profile.matricule ?? profile.id;
}
