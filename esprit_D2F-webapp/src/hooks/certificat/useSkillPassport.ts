import { useQuery, useMutation } from "@tanstack/react-query";
import SkillPassportService from "@/services/certificat/SkillPassportService";
import type { TeacherSkillPassportDTO } from "@/models/certificat";

export function useMyPassportData() {
  return useQuery<TeacherSkillPassportDTO>({
    queryKey: ["skill-passport", "me"],
    queryFn: () => SkillPassportService.getMyPassportData(),
  });
}

export function usePassportDataByUsername(username: string | undefined) {
  return useQuery<TeacherSkillPassportDTO>({
    queryKey: ["skill-passport", username],
    queryFn: () => SkillPassportService.getPassportDataByUsername(username!),
    enabled: !!username,
  });
}

export function useDownloadMyPassport() {
  return useMutation({
    mutationFn: () => SkillPassportService.downloadMyPassport(),
  });
}

export function useDownloadPassportByUsername() {
  return useMutation({
    mutationFn: (username: string) => SkillPassportService.downloadPassportByUsername(username),
  });
}
