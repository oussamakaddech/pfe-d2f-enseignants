import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import OneDriveService from "@/services/api/OneDriveService";

export function useDriveHierarchy() {
  return useQuery<unknown>({
    queryKey: ["onedrive", "hierarchy"],
    queryFn: () => OneDriveService.getDriveHierarchy(),
  });
}

export function useFormationHierarchy(idFormation: number | string | undefined) {
  return useQuery<unknown>({
    queryKey: ["onedrive", "formation-hierarchy", idFormation],
    queryFn: () => OneDriveService.getFormationHierarchy(idFormation!),
    enabled: !!idFormation,
  });
}

export function useDownloadOneDriveFile() {
  return useMutation({
    mutationFn: ({
      nomFormation,
      nomDocument,
      originalFileName,
    }: {
      nomFormation: string;
      nomDocument: string;
      originalFileName: string;
    }) => OneDriveService.downloadFile(nomFormation, nomDocument, originalFileName),
  });
}

export function useDeleteOneDriveFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      nomFormation,
      nomDocument,
      originalFileName,
    }: {
      nomFormation: string;
      nomDocument: string;
      originalFileName: string;
    }) => OneDriveService.deleteFile(nomFormation, nomDocument, originalFileName),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onedrive"] }),
  });
}

export function useGetEmbedLink() {
  return useMutation({
    mutationFn: ({
      nomFormation,
      nomDocument,
    }: {
      nomFormation: string;
      nomDocument: string;
    }) => OneDriveService.getEmbedLink(nomFormation, nomDocument),
  });
}
